import { ProverMode, Pools, SnarkConfigParams, Chains, Pool, ClientConfig, AccountConfig, accountId } from './config';
import { ethAddrToBuf, toCompactSignature, truncateHexPrefix,
          toTwosComplementHex, addressFromSignature, bufToHex
        } from './utils';
import { SyncStat, ZkBobState } from './state';
import { TxType } from './tx';
import { NetworkBackend } from './networks/network';
import { CONSTANTS } from './constants';
import { HistoryRecord, HistoryRecordState, HistoryTransactionType } from './history'
import { EphemeralAddress } from './ephemeral';
import { Proof, ITransferData, IWithdrawData, StateUpdate, TreeNode } from 'libzkbob-rs-wasm-web';
import { 
  InternalError, PoolJobError, RelayerJobError, SignatureError, TxDepositDeadlineExpiredError,
  TxInsufficientFundsError, TxInvalidArgumentError, TxLimitError, TxProofError, TxSmallAmount
} from './errors';
import { isHexPrefixed } from '@ethereumjs/util';
import { recoverTypedSignature, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { isAddress } from 'web3-utils';
import { JobInfo, ZkBobRelayer } from './services/relayer';
import { TreeState, ZkBobAccountlessClient } from './client-base';
import { wrap } from 'comlink';
import { ZkBobDelegatedProver } from './services/prover';

const OUTPLUSONE = CONSTANTS.OUT + 1; // number of leaves (account + notes) in a transaction
const PARTIAL_TREE_USAGE_THRESHOLD = 500; // minimum tx count in Merkle tree to partial tree update using
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const PERMIT_DEADLINE_INTERVAL = 1200;   // permit deadline is current time + 20 min
const PERMIT_DEADLINE_THRESHOLD = 300;   // minimum time to deadline before tx proof calculation and sending (5 min)

// Transfer destination + amount
// Used as input in `transferMulti` method
// Please note the request could be fragmented
// due to account-notes local configuration
export interface TransferRequest {
  destination: string;  // shielded address for transfer, any value for another tx types
  amountGwei: bigint;
}

// Multiple transfer requests with total amount
export interface MultinoteTransferRequest {
  totalAmount: bigint;
  requests: TransferRequest[];
}

// Old TxAmount interface
// Supporting for multi-note transfers
// Descripbes a transfer transaction configuration
export interface TransferConfig {
  inNotesBalance: bigint;
  outNotes: TransferRequest[];  // tx notes (without fee)
  fee: bigint;  // transaction fee, Gwei
  accountLimit: bigint;  // minimum account remainder after transaction
                         // (for future use, e.g. complex multi-tx transfers, default: 0)
}

export interface FeeAmount { // all values are in Gwei
  total: bigint;    // total fee
  totalPerTx: bigint; // multitransfer case (== total for regular tx)
  txCnt: number;      // multitransfer case (== 1 for regular tx)
  relayer: bigint;  // relayer fee component
  l1: bigint;       // L1 fee component
  insufficientFunds: boolean; // true when the local balance is insufficient for requested tx amount
}

export class ZkBobClient extends ZkBobAccountlessClient {
  // States for the current account in the different pools
  private zpStates: { [poolAlias: string]: ZkBobState } = {};
  // Holds gift cards temporary states (id - gift card unique ID based on sk and pool)
  private auxZpStates: { [id: string]: ZkBobState } = {};
  // The single worker for the all pools
  // Currently we assume parameters are the same for the all pools
  private worker: any;
  // Active account config. It can be undefined util user isn't login
  // If it's undefined the ZkBobClient acts as accountless client
  // (client-oriented methods will throw error)
  private account: AccountConfig | undefined;

  // Jobs monitoring
  private monitoredJobs = new Map<string, JobInfo>();
  private jobsMonitors  = new Map<string, Promise<JobInfo>>();

  // ------------------------=========< Lifecycle >=========------------------------
  // | Init and free client, login/logout, switching between pools                 |
  // -------------------------------------------------------------------------------

  private constructor(pools: Pools, chains: Chains, initialPool: string, supportId: string | undefined) {
    super(pools, chains, initialPool, supportId);
    this.account = undefined;
  }

  private async workerInit(
    snarkParams: SnarkConfigParams,
    forcedMultithreading: boolean | undefined = undefined, // specify this parameter to override multithreading autoselection
  ): Promise<Worker> {
    // Get tx parameters hash from the relayer
    // to check local params consistence
    let txParamsHash: string | undefined = undefined;
    try {
      txParamsHash = await this.relayer(this.curPool).txParamsHash();
    } catch (err) {
      console.warn(`Cannot fetch tx parameters hash from the relayer (${err.message})`);
    }
  
    let worker: any;
  
    worker = wrap(new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }));
      await worker.initWasm({
        txParams: snarkParams.transferParamsUrl,
        treeParams: snarkParams.treeParamsUrl,
      },
      txParamsHash, 
      {
        transferVkUrl: snarkParams.transferVkUrl,
        treeVkUrl: snarkParams.treeVkUrl,
      },
      forcedMultithreading);
  
    return worker;
  }

  public static async create(config: ClientConfig, activePoolAlias: string): Promise<ZkBobClient> {
    if (Object.keys(config.pools).length == 0) {
      throw new InternalError(`Cannot initialize library without pools`);
    }
    const client = new ZkBobClient(config.pools, config.chains, activePoolAlias, config.supportId ?? "");

    const worker = await client.workerInit(config.snarkParams);

    client.zpStates = {};
    client.worker = worker;
    
    return client;
  }

  private async free(): Promise<void> {
    for (const poolName of Object.keys(this.zpStates)) {
      this.freePoolState(poolName);
    }

    for (const accId of Object.keys(this.auxZpStates)) {
      await this.auxZpStates[accId].free();
      delete this.auxZpStates[accId];
    }
  }

  private async freePoolState(poolAlias: string) {
    if (this.zpStates[poolAlias]) {
      await this.zpStates[poolAlias].free();
      delete this.zpStates[poolAlias];
    }
  }

  public async login(account: AccountConfig) {
    this.account = account;
    await this.switchToPool(account.pool, account.birthindex);
    try {
      await this.setProverMode(this.account.proverMode);
    } catch (err) {
      console.error(err);
    }
  }

  public async logout() {
    this.free();
    this.account = undefined;
  }

  // Swithing to the another pool without logout with the same spending key
  // Also available before login (just switch pool to use the instance as an accoutless client)
  public async switchToPool(poolAlias: string, birthindex?: number) {
    // remove currently activated state if exist [to reduce memory consumption]
    this.freePoolState(this.curPool);

    // the following values for the requested pool should be available
    // even in case of accountless client => get it to exclude any throws
    const pool = this.pool(poolAlias);
    const denominator = await this.denominator(poolAlias);
    const poolId = await this.poolId(poolAlias);
    const network = this.network(poolAlias);
    const networkName = this.networkName(poolAlias);

    super.switchToPool(poolAlias); // set active pool for accountless mode

    const newPoolAlias = super.currentPool()

    if (this.account) {
      this.monitoredJobs.clear();
      await Promise.all(this.jobsMonitors.values());
      this.jobsMonitors.clear();

      this.account.pool = newPoolAlias;
      this.account.birthindex = birthindex;
      if (this.account.birthindex == -1) {  // -1 means `account born right now`
        try { // fetch current birthindex right away
          let curIndex = Number((await this.relayer(newPoolAlias).info()).deltaIndex);
          if (curIndex >= (PARTIAL_TREE_USAGE_THRESHOLD * OUTPLUSONE) && curIndex >= OUTPLUSONE) {
            curIndex -= OUTPLUSONE; // we should grab almost one transaction from the regular state
            console.log(`Retrieved account birthindex: ${curIndex}`);
            this.account.birthindex = curIndex;
          } else {
            console.log(`Birthindex is lower than threshold (${PARTIAL_TREE_USAGE_THRESHOLD} txs). It'll be ignored`);
            this.account.birthindex = undefined;
          }
        } catch (err) {
          console.warn(`Cannot retrieve actual birthindex (Error: ${err.message}). The full sync will be performed`);
          this.account.birthindex = undefined;
        }
      }

      this.zpStates[newPoolAlias] = await ZkBobState.create(
          this.account.sk,
          this.account.birthindex,
          networkName,
          network.getRpcUrl(),
          denominator,
          poolId,
          pool.tokenAddress,
          this.worker
        );

      console.log(`Pool and user account was switched to ${newPoolAlias} successfully`);
    } else {
      console.log(`Pool was switched to ${newPoolAlias} but account is not set yet`);
    }
  }

  public hasAccount(): boolean {
    return this.account && this.zpStates[this.curPool] ? true : false;
  }

  // return current state if poolAlias absent
  protected zpState(poolAlias: string | undefined = undefined): ZkBobState {
    const requestedPool = poolAlias ?? this.curPool;
    if (!this.zpStates[requestedPool]) {
      throw new InternalError(`State for pool ${requestedPool} is not initialized`);
    }

    return this.zpStates[requestedPool];
  }

  // ------------------=========< Balances and History >=========-------------------
  // | Quering shielded balance and history records                                |
  // -------------------------------------------------------------------------------

  // Get account + notes balance in Gwei
  // [with optional state update]
  public async getTotalBalance(updateState: boolean = true): Promise<bigint> {
    if (updateState) {
      await this.updateState();
    }

    return await this.zpState().getTotalBalance();
  }

  // Get total balance with components: account and notes
  // [with optional state update]
  // Returns [total, account, note] in Gwei
  public async getBalances(updateState: boolean = true): Promise<[bigint, bigint, bigint]> {
    if (updateState) {
      await this.updateState();
    }

    return await this.zpState().getBalances();
  }

  // Get total balance including transactions in optimistic state [in Gwei]
  // There is no option to prevent state update here,
  // because we should always monitor optimistic state
  public async getOptimisticTotalBalance(updateState: boolean = true): Promise<bigint> {

    const confirmedBalance = await this.getTotalBalance(updateState);
    const historyRecords = await this.getAllHistory(updateState);

    let pendingDelta = BigInt(0);
    for (const oneRecord of historyRecords) {
      if (oneRecord.state == HistoryRecordState.Pending) {
        switch (oneRecord.type) {
          case HistoryTransactionType.Deposit:
          case HistoryTransactionType.TransferIn: {
            // we don't spend fee from the shielded balance in case of deposit or input transfer
            pendingDelta = oneRecord.actions.map(({ amount }) => amount).reduce((acc, cur) => acc + cur, pendingDelta);
            break;
          }
          case HistoryTransactionType.Withdrawal:
          case HistoryTransactionType.TransferOut: {
            pendingDelta = oneRecord.actions.map(({ amount }) => amount).reduce((acc, cur) => acc - cur, pendingDelta);
            pendingDelta -= oneRecord.fee;
            break;
          }
          case HistoryTransactionType.AggregateNotes: {
            pendingDelta -= oneRecord.fee;
            break;
          }

          default: break;
        }
      }
    }

    return confirmedBalance + pendingDelta;
  }

  // `giftCardAccount` fields should be set with the gift card associated properties:
  // (sk, birthIndex, pool); proverMode field doesn't affect here
  public async giftCardBalance(giftCardAcc: AccountConfig): Promise<bigint> {
    const accId = accountId(giftCardAcc);
    if (!this.auxZpStates[accId]) {
      // create gift-card auxiliary state if needed
      const networkName = this.networkName(giftCardAcc.pool);
      const poolId = await this.poolId(giftCardAcc.pool);
      const giftCardState = await ZkBobState.createNaked(giftCardAcc.sk, giftCardAcc.birthindex, networkName, poolId, this.worker);

      // state will be removed after gift card redemption or on logout
      this.auxZpStates[accId] = giftCardState;
    }

    // update gift card state
    const giftCardState = this.auxZpStates[accId];
    const relayer = this.relayer(giftCardAcc.pool);
    const readyToTransact = await giftCardState.updateState(
      relayer,
      async (index) => (await this.getPoolState(index, giftCardAcc.pool)).root,
      await this.coldStorageConfig(giftCardAcc.pool),
      this.coldStorageBaseURL(giftCardAcc.pool),
    );
    if (!readyToTransact) {
      console.warn(`Gift card account isn't ready to transact right now. Most likely the gift-card is in redeeming state`);
    }
    
    return giftCardState.getTotalBalance();
  }

  // Get history records
  public async getAllHistory(updateState: boolean = true): Promise<HistoryRecord[]> {
    if (updateState) {
      await this.updateState();
    }

    return await this.zpState().history?.getAllHistory((addr) => this.isMyAddress(addr)) ?? [];
  }

  // ------------------=========< Service Routines >=========-------------------
  // | Methods for creating and sending transactions in different modes        |
  // ---------------------------------------------------------------------------

  // Generate shielded address to receive funds
  public async generateAddress(poolAlias: string | undefined = undefined): Promise<string> {
    const state = this.zpState();
    return await state.generateAddress();
  }

  // Generate address with the specified seed
  public async genBurnerAddress(seed: Uint8Array, poolAlias: string | undefined = undefined): Promise<string> {
    const poolId = await this.poolId(poolAlias);
    return this.worker.genBurnerAddress(poolId, seed);
  }

  // Returns true if shieldedAddress belogs to the user's account
  public async isMyAddress(shieldedAddress: string): Promise<boolean> {
    // TODO: scan over all available pools
    const state = this.zpState();
    return await state.isOwnAddress(shieldedAddress);
  }

  public async verifyShieldedAddress(address: string): Promise<boolean> {
    return await this.worker.verifyShieldedAddress(address);
  }

  // Waiting while relayer process the jobs set
  public async waitJobsTxHashes(jobIds: string[]): Promise<{jobId: string, txHash: string}[]> {
    const promises = jobIds.map(async (jobId) => {
      const txHash = await this.waitJobTxHash(jobId);
      return { jobId, txHash };
    });
    
    return Promise.all(promises);
  }

  // Waiting while relayer process the job and send it to the Pool
  // return transaction hash on success or throw an error
  public async waitJobTxHash(jobId: string): Promise<string> {
    this.startJobMonitoring(jobId);

    const CHECK_PERIOD_MS = 500;
    let txHash = '';
    while (true) {
      const job = this.monitoredJobs.get(jobId);

      if (job !== undefined) {
        if (job.txHash) txHash = job.txHash;

        if (job.state === 'failed') {
          throw new RelayerJobError(Number(jobId), job.failedReason ? job.failedReason : 'unknown reason');
        } else if (job.state === 'sent') {
          if (!job.txHash) throw new InternalError(`Relayer return job #${jobId} without txHash in 'sent' state`);
          break;
        } else if (job.state === 'reverted')  {
          throw new PoolJobError(Number(jobId), job.txHash ? job.txHash : 'no_txhash', job.failedReason ?? 'unknown reason');
        } else if (job.state === 'completed') {
          if (!job.txHash) throw new InternalError(`Relayer return job #${jobId} without txHash in 'completed' state`);
          break;
        }
      }

      await new Promise(resolve => setTimeout(resolve, CHECK_PERIOD_MS));
    }

    return txHash;
  }

  // Start monitoring job
  // Return existing promise or start new one
  private async startJobMonitoring(jobId: string): Promise<JobInfo> {
    const existingMonitor = this.jobsMonitors.get(jobId);
    if (existingMonitor === undefined) {
      const newMonitor = this.jobMonitoringWorker(jobId).finally(() => {
        this.jobsMonitors.delete(jobId);
      });
      this.jobsMonitors.set(jobId, newMonitor);

      return newMonitor;
    } else {
      return existingMonitor;
    }
  }

  // Monitor job while it isn't going to the terminal state
  // Returns job in terminal state
  //
  // Job state machine:
  // 1. `waiting`  : tx in the relayer's verification/sending queue
  // 2. `failed`   : tx was rejected by relayer (nothing was sent to the Pool)
  // 3. `sent`     : tx in the optimistic state (sent on the Pool but not mined yet) and it has a txHash
  // 4. `reverted` : tx was reverted on the Pool contract and will not resend by relayer (txHash presented)
  // 5. `completed`: tx was mined and included in the regular state (txHash cannot be changed anymore)
  //
  // The normal transaction flow: `waiting` -> `sent` -> `completed`
  // The following states are terminal (means no any changes in task will happened): `failed`, `reverted`, `completed`
  // The job state can be switched from `sent` to `waiting` state - it means transaction was resent
  //
  private async jobMonitoringWorker(jobId: string): Promise<JobInfo> {
    const relayer = this.relayer();
    const state = this.zpState();

    const INTERVAL_MS = 1000;
    let job: JobInfo;
    let lastTxHash = '';
    let lastJobState = '';
    while (true) {
      const jobInfo = await relayer.getJob(jobId).catch(() => null);

      if (jobInfo === null) {
        throw new RelayerJobError(Number(jobId), 'not found');
      } else {
        job = jobInfo;
        const jobDescr = `job #${jobId}${job.resolvedJobId != jobId ? `(->${job.resolvedJobId})` : ''}`;
        
        // update local job info
        this.monitoredJobs.set(jobId, job);
        
        if (job.state === 'waiting')  {
          // Tx in the relayer's verification/sending queue
          if (job.state != lastJobState) {
            console.info(`JobMonitoring: ${jobDescr} waiting while relayer processed it`);
          }
        } else if (job.state === 'failed')  {
          // [TERMINAL STATE] Transaction was failed during relayer's verification
          const relayerReason = job.failedReason ?? 'unknown reason';
          state.history?.setQueuedTransactionFailedByRelayer(jobId, relayerReason);
          console.info(`JobMonitoring: ${jobDescr} was discarded by relayer with reason '${relayerReason}'`);
          break;
        } else if (job.state === 'sent') {
          // Tx should appear in the optimistic state with current txHash
          if (job.txHash) {
            if (lastTxHash != job.txHash) {
              state.history?.setTxHashForQueuedTransactions(jobId, job.txHash);
              console.info(`JobMonitoring: ${jobDescr} was ${job.resolvedJobId != jobId ? 'RE' : ''}sent to the pool: ${job.txHash}`);   
            }
          } else {
            console.warn(`JobMonitoring: ${jobDescr} was sent to the pool but has no assigned txHash [relayer issue]`);
          }
        } else if (job.state === 'reverted')  {
          // [TERMINAL STATE] Transaction was reverted on the Pool and won't resend
          // get revert reason first (from the relayer or from the contract directly)
          let revertReason: string = 'unknown reason';
          if (job.failedReason) {
            revertReason = job.failedReason;  // reason from the relayer
          } else if (job.txHash) {
            // the relayer doesn't provide failure reason - fetch it directly
            const retrievedReason = (await this.network(this.curPool).getTxRevertReason(job.txHash));
            revertReason = retrievedReason ?? 'transaction was not found\\reverted'
          } else {
            console.warn(`JobMonitoring: ${jobDescr} has no txHash in reverted state [relayer issue]`)
          }

          state.history?.setSentTransactionFailedByPool(jobId, job.txHash ?? '', revertReason);
          console.info(`JobMonitoring: ${jobDescr} was reverted on pool with reason '${revertReason}': ${job.txHash}`);
          break;
        } else if (job.state === 'completed') {
          // [TERMINAL STATE] Transaction has been mined successfully and should appear in the regular state
          state.history?.setQueuedTransactionsCompleted(jobId, job.txHash ?? '');
          if (job.txHash) {
            console.info(`JobMonitoring: ${jobDescr} was mined successfully: ${job.txHash}`);
          } else {
            console.warn(`JobMonitoring: ${jobDescr} was mined but has no assigned txHash [relayer issue]`);
          }
          break;
        }

        lastJobState = job.state;
        if (job.txHash) lastTxHash = job.txHash;

      }

      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }

    return job;
  }

  // ------------------=========< Making Transactions >=========-------------------
  // | Methods for creating and sending transactions in different modes           |
  // ------------------------------------------------------------------------------

  // Deposit based on permittable token scheme. User should sign typed data to allow
  // contract receive his tokens
  // Returns jobId from the relayer or throw an Error
  public async depositPermittable(
    amountGwei: bigint,
    signTypedData: (deadline: bigint, value: bigint, salt: string) => Promise<string>,
    fromAddress: string | null = null,
    feeGwei: bigint = BigInt(0),
  ): Promise<string> {
    const pool = this.pool();
    const relayer = this.relayer();
    const state = this.zpState();
    const denominator = await this.denominator();

    const minTx = await this.minTxAmount();
    if (amountGwei < minTx) {
      throw new TxSmallAmount(amountGwei, minTx);
    }

    const limits = await this.getLimits((fromAddress !== null) ? fromAddress : undefined);
    if (amountGwei > limits.deposit.total) {
      throw new TxLimitError(amountGwei, limits.deposit.total);
    }

    await this.updateState();

    let txData;
    if (fromAddress) {
      const deadline = Math.floor(Date.now() / 1000) + PERMIT_DEADLINE_INTERVAL;
      const holder = ethAddrToBuf(fromAddress);
      txData = await state.createDepositPermittable({ 
        amount: (amountGwei + feeGwei).toString(),
        fee: feeGwei.toString(),
        deadline: String(deadline),
        holder
      });

      // permittable deposit signature should be calculated for the typed data
      const value = (amountGwei + feeGwei) * denominator;
      const salt = '0x' + toTwosComplementHex(BigInt(txData.public.nullifier), 32);
      let signature = truncateHexPrefix(await signTypedData(BigInt(deadline), value, salt));
      if (this.network(this.curPool).isSignatureCompact()) {
        signature = toCompactSignature(signature);
      }

      // Checking signature correct (and corresponded with declared address)
      const claimedAddr = `0x${bufToHex(holder)}`;
      let recoveredAddr;
      try {
        const dataToSign: any = await this.createPermittableDepositData('1', claimedAddr, pool.poolAddress, value, BigInt(deadline), salt);
        recoveredAddr = recoverTypedSignature({data: dataToSign, signature: `0x${signature}`, version: SignTypedDataVersion.V4});
      } catch (err) {
        throw new SignatureError(`Cannot recover address from the provided signature. Error: ${err.message}`);
      }
      if (recoveredAddr != claimedAddr) {
        throw new SignatureError(`The address recovered from the permit signature ${recoveredAddr} doesn't match the declared one ${claimedAddr}`);
      }

      // We should check deadline here because the user could introduce great delay
      if (Math.floor(Date.now() / 1000) > deadline - PERMIT_DEADLINE_THRESHOLD) {
        throw new TxDepositDeadlineExpiredError(deadline);
      }

      const startProofDate = Date.now();
      const txProof = await this.proveTx(txData.public, txData.secret);
      const proofTime = (Date.now() - startProofDate) / 1000;
      console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

      // Checking the depositor's token balance before sending tx
      let balance;
      try {
        balance = (await this.network(this.curPool).getTokenBalance(pool.tokenAddress, claimedAddr)) / denominator;
      } catch (err) {
        throw new InternalError(`Unable to fetch depositor's balance. Error: ${err.message}`);
      }
      if (balance < (amountGwei + feeGwei)) {
        throw new TxInsufficientFundsError(amountGwei, balance);
      }

      const tx = { txType: TxType.BridgeDeposit, memo: txData.memo, proof: txProof, depositSignature: signature };
      const jobId = await relayer.sendTransactions([tx]);
      this.startJobMonitoring(jobId);

      // Temporary save transaction in the history module (to prevent history delays)
      const ts = Math.floor(Date.now() / 1000);
      const rec = await HistoryRecord.deposit(fromAddress, amountGwei, feeGwei, ts, '0', true);
      state.history?.keepQueuedTransactions([rec], jobId);

      return jobId;

    } else {
      throw new TxInvalidArgumentError('You must provide fromAddress for deposit transaction');
    }
  }

  private async createPermittableDepositData(
    version: string,
    owner: string,
    spender: string,
    value: bigint,
    deadline: bigint,
    salt: string): Promise<object>
  {
    const tokenAddress = this.pool().tokenAddress;
    const tokenName = await this.network().getTokenName(tokenAddress);
    const chainId = await this.network().getChainId();
    const nonce = await this.network().getTokenNonce(tokenAddress, owner);

    const domain = {
        name: tokenName,
        version: version,
        chainId: chainId,
        verifyingContract: tokenAddress,
    };

    const types = {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
      Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'salt', type: 'bytes32' }
        ],
    };

    const message = { owner, spender, value: value.toString(), nonce, deadline: deadline.toString(), salt };

    const data = { types, primaryType: 'Permit', domain, message };

    return data;
}

  public async depositPermittableEphemeral(
    amountGwei: bigint,
    ephemeralIndex: number,
    feeGwei: bigint = BigInt(0),
  ): Promise<string> {
    const state = this.zpState();
    const fromAddress = await state.ephemeralPool().getEphemeralAddress(ephemeralIndex);

    return this.depositPermittable(amountGwei, async (deadline, value, salt) => {
      const pool = this.pool();
      const state = this.zpState();
      const denominator = await this.denominator();

      // we should check token balance here since the library is fully responsible
      // for ephemeral address in contrast to depositing from external user's address
      const neededGwei = value / denominator;
      if(fromAddress.tokenBalance < neededGwei) {
        throw new TxInsufficientFundsError(neededGwei, fromAddress.tokenBalance);
      }

      let ephemeralAddress = await state.ephemeralPool().getAddress(ephemeralIndex);
      const dataToSign = await this.createPermittableDepositData('1', ephemeralAddress, pool.poolAddress, value, deadline, salt);
      return await state.ephemeralPool().signTypedData(dataToSign, ephemeralIndex);
    }, fromAddress.address, feeGwei);
  }

  // Transfer shielded funds to the shielded address
  // This method can produce several transactions in case of insufficient input notes (constants::IN per tx)
  // Returns jobIds from the relayer or throw an Error
  public async transferMulti(transfers: TransferRequest[], feeGwei: bigint = BigInt(0)): Promise<string[]> {
    const state = this.zpState();
    const relayer = this.relayer(this.curPool);

    await Promise.all(transfers.map(async (aTx) => {
      if (!await this.verifyShieldedAddress(aTx.destination)) {
        throw new TxInvalidArgumentError('Invalid address. Expected a shielded address.');
      }

      const minTx = await this.minTxAmount();
      if (aTx.amountGwei < minTx) {
        throw new TxSmallAmount(aTx.amountGwei, minTx);
      }
    }));

    const txParts = await this.getTransactionParts(transfers, feeGwei);

    if (txParts.length == 0) {
      const available = await this.calcMaxAvailableTransfer(false);
      const amounts = transfers.map((aTx) => aTx.amountGwei);
      const totalAmount = amounts.reduce((acc, cur) => acc + cur, BigInt(0));
      const feeEst = await this.feeEstimate(amounts, TxType.Transfer, false);
      throw new TxInsufficientFundsError(totalAmount + feeEst.total, available);
    }

    let jobsIds: string[] = [];
    let optimisticState = this.zeroOptimisticState();
    for (let index = 0; index < txParts.length; index++) {
      const onePart = txParts[index];
      const outputs = onePart.outNotes.map((aNote) => { return {to: aNote.destination, amount: `${aNote.amountGwei}`} });
      const oneTx: ITransferData = {
        outputs,
        fee: onePart.fee.toString(),
      };
      const oneTxData = await state.createTransferOptimistic(oneTx, optimisticState);

      console.log(`Transaction created: delta_index = ${oneTxData.parsed_delta.index}, root = ${oneTxData.public.root}`);

      const startProofDate = Date.now();
      const txProof: Proof = await this.proveTx(oneTxData.public, oneTxData.secret);
      const proofTime = (Date.now() - startProofDate) / 1000;
      console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

      const transaction = {memo: oneTxData.memo, proof: txProof, txType: TxType.Transfer};

      const jobId = await relayer.sendTransactions([transaction]);
      this.startJobMonitoring(jobId);
      jobsIds.push(jobId);

      // Temporary save transaction parts in the history module (to prevent history delays)
      const ts = Math.floor(Date.now() / 1000);
      const transfers = outputs.map((out) => { return {to: out.to, amount: BigInt(out.amount)} });
      if (transfers.length == 0) {
        const record = await HistoryRecord.aggregateNotes(onePart.fee, ts, '0', true);
        state.history?.keepQueuedTransactions([record], jobId);
      } else {
        const record = await HistoryRecord.transferOut(transfers, onePart.fee, ts, '0', true, (addr) => this.isMyAddress(addr));
        state.history?.keepQueuedTransactions([record], jobId);
      }

      if (index < (txParts.length - 1)) {
        console.log(`Waiting for the job ${jobId} joining the optimistic state`);
        // if there are few additional tx, we should collect the optimistic state before processing them
        await this.waitJobTxHash(jobId);

        optimisticState = await this.zpState().getNewState(this.relayer(), this.account?.birthindex ?? 0);
      }
    }

    return jobsIds;
  }

  private zeroOptimisticState(): StateUpdate {
    const optimisticState: StateUpdate = {
      newLeafs: [],
      newCommitments: [],
      newAccounts: [],
      newNotes: [],
    }

    return optimisticState;
  }

  // Withdraw shielded funds to the specified native chain address
  // This method can produce several transactions in case of insufficient input notes (constants::IN per tx)
  // feeGwei - fee per single transaction (request it with atomicTxFee method)
  // Returns jobId from the relayer or throw an Error
  public async withdrawMulti(address: string, amountGwei: bigint, feeGwei: bigint = BigInt(0)): Promise<string[]> {
    const relayer = this.relayer(this.curPool);
    const state = this.zpState();

    // Validate withdrawal address:
    //  - it should starts with '0x' prefix
    //  - it should be 20-byte length
    //  - if it contains checksum (EIP-55) it should be valid
    //  - zero addresses are prohibited to withdraw
    if (!isHexPrefixed(address) || !isAddress(address) || address.toLowerCase() == NULL_ADDRESS) {
      throw new TxInvalidArgumentError('Please provide a valid non-zero address');
    }
    const addressBin = ethAddrToBuf(address);

    const minTx = await this.minTxAmount();
    if (amountGwei < minTx) {
      throw new TxSmallAmount(amountGwei, minTx);
    }

    const limits = await this.getLimits(address);
    if (amountGwei > limits.withdraw.total) {
      throw new TxLimitError(amountGwei, limits.withdraw.total);
    }

    const txParts = await this.getTransactionParts([{amountGwei, destination: address}], feeGwei);

    if (txParts.length == 0) {
      const available = await this.calcMaxAvailableTransfer(false);
      const feeEst = await this.feeEstimate([amountGwei], TxType.Withdraw, false);
      throw new TxInsufficientFundsError(amountGwei + feeEst.total, available);
    }

    let jobsIds: string[] = [];
    let optimisticState = this.zeroOptimisticState();
    for (let index = 0; index < txParts.length; index++) {
      const onePart = txParts[index];
      
      let oneTxData: any;
      let txType: TxType;
      if (onePart.outNotes.length == 0) {
        const oneTx: ITransferData = {
          outputs: [],
          fee: onePart.fee.toString(),
        };
        oneTxData = await state.createTransferOptimistic(oneTx, optimisticState);
        txType = TxType.Transfer;
      } else if (onePart.outNotes.length == 1) {
        const oneTx: IWithdrawData = {
          amount: onePart.outNotes[0].amountGwei.toString(),
          fee: onePart.fee.toString(),
          to: addressBin,
          native_amount: '0',
          energy_amount: '0',
        };
        oneTxData = await state.createWithdrawalOptimistic(oneTx, optimisticState);
        txType = TxType.Withdraw;
      } else {
        throw new Error('Invalid transaction configuration');
      }

      const startProofDate = Date.now();
      const txProof: Proof = await this.proveTx(oneTxData.public, oneTxData.secret);
      const proofTime = (Date.now() - startProofDate) / 1000;
      console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

      const transaction = {memo: oneTxData.memo, proof: txProof, txType};

      const jobId = await relayer.sendTransactions([transaction]);
      this.startJobMonitoring(jobId);
      jobsIds.push(jobId);

      // Temporary save transaction part in the history module (to prevent history delays)
      const ts = Math.floor(Date.now() / 1000);
      if (txType == TxType.Transfer) {
        const record = await HistoryRecord.aggregateNotes(onePart.fee, ts, '0', true);
        state.history?.keepQueuedTransactions([record], jobId);
      } else {
        const record = await HistoryRecord.withdraw(address, onePart.outNotes[0].amountGwei, onePart.fee, ts, '0', true);
        state.history?.keepQueuedTransactions([record], jobId);
      }

      if (index < (txParts.length - 1)) {
        console.log(`Waiting for the job ${jobId} joining the optimistic state`);
        // if there are few additional tx, we should collect the optimistic state before processing them
        await this.waitJobTxHash(jobId);

        optimisticState = await this.zpState().getNewState(this.relayer(), this.account?.birthindex ?? 0);
      }
    }

    return jobsIds;
  }

  // Transfer shielded tokens from the another account to the current account
  // It's suitable for gift-cards redeeming
  // NOTE: for simplicity we assume the multitransfer doesn't applicable for gift-cards
  // (i.e. any redemption can be done in a single transaction)
  public async redeemGiftCard(giftCardAcc: AccountConfig): Promise<string> {
    if (!this.account) {
      throw new InternalError(`Cannot redeem gift card to the uninitialized account`);
    }
    if (giftCardAcc.pool != this.curPool) {
      throw new InternalError(`Cannot redeem gift card due to unsuitable pool (gift-card pool: ${giftCardAcc.pool}, current pool: ${this.curPool})`);
    }
    
    const accId = accountId(giftCardAcc);
    const giftCardBalance = await this.giftCardBalance(giftCardAcc);
    const fee = await this.atomicTxFee();
    const minTxAmount = await this.minTxAmount();
    if (giftCardBalance - fee < minTxAmount) {
      throw new TxInsufficientFundsError(minTxAmount + fee, giftCardBalance)
    }

    const redeemAmount = giftCardBalance - fee; // full redemption
    const dstAddr = await this.generateAddress(); // getting address from the current account
    const oneTx: ITransferData = {
      outputs: [{to: dstAddr, amount: `${redeemAmount}`}],
      fee: fee.toString(),
    };
    const giftCardState = this.auxZpStates[accId];
    const txData = await giftCardState.createTransferOptimistic(oneTx, this.zeroOptimisticState());

    const startProofDate = Date.now();
    const txProof: Proof = await this.proveTx(txData.public, txData.secret);
    const proofTime = (Date.now() - startProofDate) / 1000;
    console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

    const transaction = {memo: txData.memo, proof: txProof, txType: TxType.Transfer};

    const relayer = this.relayer();
    const jobId = await relayer.sendTransactions([transaction]);
    this.startJobMonitoring(jobId);

    // Temporary save transaction in the history module for the current account
    const ts = Math.floor(Date.now() / 1000);
    const rec = await HistoryRecord.transferIn([{to: dstAddr, amount: redeemAmount}], fee, ts, '0', true);
    this.zpState().history?.keepQueuedTransactions([rec], jobId);

    // forget the gift card state 
    this.auxZpStates[accId].free();
    delete this.auxZpStates[accId];

    return jobId;
  }

  // DEPRECATED. Please use depositPermittableV2 method instead
  // Deposit throught approval allowance
  // User should approve allowance for contract address at least 
  // (amountGwei + feeGwei) tokens before calling this method
  // Returns jobId
  public async deposit(
    amountGwei: bigint,
    sign: (data: string) => Promise<string>,
    fromAddress: string | null = null,  // this field is only for substrate-based network,
                                        // it should be null for EVM
    feeGwei: bigint = BigInt(0),
  ): Promise<string> {
    const pool = this.pool();
    const state = this.zpState();
    const relayer = this.relayer();
    const denominator = await this.denominator();

    const minTx = await this.minTxAmount();
    if (amountGwei < minTx) {
      throw new TxSmallAmount(amountGwei, minTx);
    }

    await this.updateState();

    const txData = await state.createDeposit({
      amount: (amountGwei + feeGwei).toString(),
      fee: feeGwei.toString(),
    });

    const startProofDate = Date.now();
    const txProof = await this.proveTx(txData.public, txData.secret);
    const proofTime = (Date.now() - startProofDate) / 1000;
    console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

    // regular deposit through approve allowance: sign transaction nullifier
    const dataToSign = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');

    // TODO: Sign fromAddress as well?
    const signature = truncateHexPrefix(await sign(dataToSign));
    
    // now we can restore actual depositer address and check it for limits
    const addrFromSig = addressFromSignature(signature, dataToSign);
    const limits = await this.getLimits(addrFromSig);
    if (amountGwei > limits.deposit.total) {
      throw new TxLimitError(amountGwei, limits.deposit.total);
    }

    let fullSignature = signature;
    if (fromAddress) {
      const addr = truncateHexPrefix(fromAddress);
      fullSignature = addr + signature;
    }

    if (this.network(this.curPool).isSignatureCompact()) {
      fullSignature = toCompactSignature(fullSignature);
    }

    // Checking the depositor's token balance before sending tx
    let balance;
    try {
      balance = (await this.network(this.curPool).getTokenBalance(pool.tokenAddress, addrFromSig)) / denominator;
    } catch (err) {
      throw new InternalError(`Unable to fetch depositor's balance. Error: ${err.message}`);
    }
    if (balance < (amountGwei + feeGwei)) {
      throw new TxInsufficientFundsError(amountGwei, balance);
    }


    const tx = { txType: TxType.Deposit, memo: txData.memo, proof: txProof, depositSignature: fullSignature };
    const jobId = await relayer.sendTransactions([tx]);
    this.startJobMonitoring(jobId);

    // Temporary save transaction in the history module (to prevent history delays)
    const ts = Math.floor(Date.now() / 1000);
    const rec = await HistoryRecord.deposit(addrFromSig, amountGwei, feeGwei, ts, '0', true);
    state.history?.keepQueuedTransactions([rec], jobId);

    return jobId;
  }

  // ------------------=========< Transaction configuration >=========-------------------
  // | These methods includes fee estimation, multitransfer estimation and other inform |
  // | functions.                                                                       |
  // ------------------------------------------------------------------------------------

  // Fee can depends on tx amount for multitransfer transactions,
  // that's why you should specify it here for general case
  // This method also supposed that in some cases fee can depends on tx amount in future
  // Currently any deposit isn't depends of amount (txCnt is always 1)
  // There are two extra states in case of insufficient funds for requested token amount:
  //  1. txCnt contains number of transactions for maximum available transfer
  //  2. txCnt can't be less than 1 (e.g. when balance is less than atomic fee)
  public async feeEstimate(transfersGwei: bigint[], txType: TxType, updateState: boolean = true): Promise<FeeAmount> {
    const relayer = await this.getRelayerFee(this.curPool);
    const l1 = BigInt(0);
    let txCnt = 1;
    const totalPerTx = relayer + l1;
    let total = totalPerTx;
    let insufficientFunds = false;

    if (txType === TxType.Transfer || txType === TxType.Withdraw) {
      // we set allowPartial flag here to get parts anywhere
      const requests: TransferRequest[] = transfersGwei.map((gwei) => { return {amountGwei: gwei, destination: NULL_ADDRESS} });  // destination address is ignored for estimation purposes
      const parts = await this.getTransactionParts(requests, totalPerTx, updateState, true);
      const totalBalance = await this.getTotalBalance(false);

      const totalSumm = parts
        .map((p) => p.outNotes.reduce((acc, cur) => acc + cur.amountGwei, BigInt(0)))
        .reduce((acc, cur) => acc + cur, BigInt(0));

      const totalRequested = transfersGwei.reduce((acc, cur) => acc + cur, BigInt(0));

      txCnt = parts.length > 0 ? parts.length : 1;  // if we haven't funds for atomic fee - suppose we can make one tx
      total = totalPerTx * BigInt(txCnt);

      insufficientFunds = (totalSumm < totalRequested || totalSumm + total > totalBalance) ? true : false;
    } else {
      // Deposit and BridgeDeposit cases are independent on the user balance
      // Fee got from the native coins, so any deposit can be make within single tx
    }

    return {total, totalPerTx, txCnt, relayer, l1, insufficientFunds};
  }

  // Account + notes balance excluding fee needed to transfer or withdraw it
  // TODO: need to optimize for edge cases (account limit calculating)
  public async calcMaxAvailableTransfer(updateState: boolean = true): Promise<bigint> {
    const state = this.zpState();
    if (updateState) {
      await this.updateState();
    }

    const txFee = await this.atomicTxFee(this.curPool);
    const groupedNotesBalances = await this.getGroupedNotes();
    let accountBalance = await state.accountBalance();

    let maxAmount = accountBalance > txFee ? accountBalance - txFee : BigInt(0);
    for (const inNotesBalance of groupedNotesBalances) {
      if (accountBalance + inNotesBalance < txFee) {
        break;
      }

      accountBalance += inNotesBalance - txFee;
      if (accountBalance > maxAmount) {
        maxAmount = accountBalance;
      }
    }
    return maxAmount;
  }

  // Calculate multitransfer configuration for specified token amount and fee per transaction
  // Applicable for transfer and withdrawal transactions. You can prevent state updating with updateState flag
  // Use allowPartial flag to return tx parts in case of insufficient funds for requested tx amount
  // (otherwise the void array will be returned in case of insufficient funds)
  // This method ALLOWS creating transaction parts less than MIN_TX_AMOUNT (check it before tx creating)
  public async getTransactionParts(
    transfers: TransferRequest[],
    feeGwei: bigint,
    updateState: boolean = true,
    allowPartial: boolean = false,
  ): Promise<Array<TransferConfig>> {

    const state = this.zpState();
    if (updateState) {
      await this.updateState();
    }

    // no parts when no requests
    if (transfers.length == 0) return [];

    let aggregatedTransfers: MultinoteTransferRequest[] = [];
    for (let i = 0; i < transfers.length; i += CONSTANTS.OUT) {
      const requests = transfers.slice(i, i + CONSTANTS.OUT);
      const totalAmount = requests.reduce(
        (acc, cur) => acc + cur.amountGwei,
        BigInt(0)
      );
      aggregatedTransfers.push({totalAmount, requests});
    }

    let accountBalance: bigint = await state.accountBalance();
    const groupedNotesBalances = await this.getGroupedNotes();

    let aggregationParts: Array<TransferConfig> = [];
    let txParts: Array<TransferConfig> = [];
    
    let i = 0;
    do {
      txParts = this.tryToPrepareTransfers(accountBalance, feeGwei, groupedNotesBalances.slice(i, i + aggregatedTransfers.length), aggregatedTransfers);
      if (txParts.length == aggregatedTransfers.length) {
        // We are able to perform all txs starting from this index
        return aggregationParts.concat(txParts);
      }

      if (groupedNotesBalances.length == 0) {
        // We can't aggregate notes if we doesn't have one
        break;
      }

      const inNotesBalance = groupedNotesBalances[i];
      if (accountBalance + inNotesBalance < feeGwei) {
        // We cannot collect amount to cover tx fee. There are 2 cases:
        // insufficient balance or unoperable notes configuration
        break;
      }

      aggregationParts.push({
        inNotesBalance,
        outNotes: [],
        fee: feeGwei,
        accountLimit: BigInt(0)
      });
      accountBalance += BigInt(inNotesBalance) - BigInt(feeGwei);
      
      i++;
    } while (i < groupedNotesBalances.length)

    return allowPartial ? aggregationParts.concat(txParts) : [];
  }

  // try to prepare transfer configs
  private tryToPrepareTransfers(balance: bigint, fee: bigint, groupedNotesBalances: Array<bigint>, transfers: MultinoteTransferRequest[]): Array<TransferConfig> {
    let accountBalance = balance;
    let parts: Array<TransferConfig> = [];
    for (let i = 0; i < transfers.length; i++) {
      const inNotesBalance = i < groupedNotesBalances.length ? groupedNotesBalances[i] : BigInt(0);

      if (accountBalance + inNotesBalance < transfers[i].totalAmount + fee) {
        // We haven't enough funds to perform such tx
        break;
      }

      parts.push({
        inNotesBalance,
        outNotes: transfers[i].requests, 
        fee, 
        accountLimit: BigInt(0)
      });
      accountBalance = (accountBalance + inNotesBalance) - (transfers[i].totalAmount + fee);
    }
    return parts;
  }

  // calculate summ of notes grouped by CONSTANTS::IN
  private async getGroupedNotes(): Promise<Array<bigint>> {
    const state = this.zpState();
    const usableNotes = await state.usableNotes();

    const notesParts: Array<bigint> = [];
    for (let i = 0; i < usableNotes.length; i += CONSTANTS.IN) {
      const inNotesBalance: bigint = usableNotes.slice(i, i + CONSTANTS.IN).reduce(
        (acc, cur) => acc + BigInt(cur[1].b),
        BigInt(0)
      );
      notesParts.push(inNotesBalance);
    }
    return notesParts;
  }

  // -------------------=========< Prover routines >=========--------------------
  // | Local and delegated prover support                                       |
  // ----------------------------------------------------------------------------
  public async setProverMode(mode: ProverMode) {
    await super.setProverMode(mode);
    if (mode != ProverMode.Delegated) {
        this.worker.loadTxParams();
    }
    //this.account?.proverMode = mode;
  }

  // Universal proving routine
  private async proveTx(pub: any, sec: any): Promise<any> {
    const proverMode = this.getProverMode(this.curPool);
    const prover = this.prover(this.curPool)
    if ((proverMode == ProverMode.Delegated || proverMode == ProverMode.DelegatedWithFallback) && prover) {
      console.debug('Delegated Prover: proveTx');
      try {
        const proof = await prover.proveTx(pub, sec);
        const inputs = Object.values(pub);
        const txValid = await this.worker.verifyTxProof(inputs, proof);
        if (!txValid) {
          throw new TxProofError();
        }
        return {inputs, proof};
      } catch (e) {
        if (proverMode == ProverMode.Delegated) {
          console.error(`Failed to prove tx using delegated prover: ${e}`);
          throw new TxProofError();
        } else {
          console.warn(`Failed to prove tx using delegated prover: ${e}. Trying to prove with local prover...`);
        }
      }
    }

    const txProof = await this.worker.proveTx(pub, sec);
    const txValid = await this.worker.verifyTxProof(txProof.inputs, txProof.proof);
    if (!txValid) {
      throw new TxProofError();
    }
    return txProof;
  }

  // ------------------=========< State Processing >=========--------------------
  // | Updating and monitoring local state                                      |
  // ----------------------------------------------------------------------------

  // Get the local Merkle tree root & index
  // Retuned the latest root when the index is undefined
  public async getLocalState(index?: bigint): Promise<TreeState> {
    const state = this.zpState();
    if (index === undefined) {
      const index = await state.getNextIndex();
      const root = await state.getRoot();

      return {root, index};
    } else {
      const root = await state.getRootAt(index);

      return {root, index};
    }
  }

  // Just informal method needed for the debug purposes
  public async getTreeStartIndex(): Promise<bigint | undefined> {
    const index = await this.zpState().getFirstIndex();

    return index;
  }

  // The library can't make any transfers when there are outcoming
  // transactions in the optimistic state
  public async isReadyToTransact(): Promise<boolean> {
    return await this.updateState();
  }

  // Wait while state becomes ready to make new transactions
  public async waitReadyToTransact(): Promise<boolean> {

    const INTERVAL_MS = 1000;
    const MAX_ATTEMPTS = 300;
    let attepts = 0;
    while (true) {
      const ready = await this.updateState();

      if (ready) {
        break;
      }

      attepts++;
      if (attepts > MAX_ATTEMPTS) {
        return false;
      }

      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }

    return true;
  }

  // Just for testing purposes. This method do not need for client
  public async getLeftSiblings(index: bigint): Promise<TreeNode[]> {
    const siblings = await this.zpState().getLeftSiblings(index);

    return siblings;
  }

  // Getting array of accounts and notes for the current account
  public async rawState(): Promise<any> {
    return await this.zpState().rawState();
  }
  
  public async rollbackState(index: bigint): Promise<bigint> {
    return await this.zpState().rollback(index);
  }
  
  public async cleanState(): Promise<void> {
    await this.zpState().clean();
  }

  // Request the latest state from the relayer
  // Returns isReadyToTransact flag
  public async updateState(): Promise<boolean> {
    const poolAlias = this.curPool;
    return await this.zpState().updateState(
      this.relayer(),
      async (index) => (await this.getPoolState(index, poolAlias)).root,
      await this.coldStorageConfig(),
      this.coldStorageBaseURL(),
    );
  }

  // ----------------=========< Ephemeral Addresses Pool >=========-----------------
  // | Getting internal native accounts (for multisig implementation)              |
  // -------------------------------------------------------------------------------
  public async getEphemeralAddress(index: number): Promise<EphemeralAddress> {
    const ephPool = this.zpState().ephemeralPool();
    return ephPool.getEphemeralAddress(index);
  }

  public async getNonusedEphemeralIndex(): Promise<number> {
    const ephPool = this.zpState().ephemeralPool();
    return ephPool.getNonusedEphemeralIndex();
  }

  public async getUsedEphemeralAddresses(): Promise<EphemeralAddress[]> {
    const ephPool = this.zpState().ephemeralPool();
    return ephPool.getUsedEphemeralAddresses();
  }

  public async getEphemeralAddressInTxCount(index: number): Promise<number> {
    const ephPool = this.zpState().ephemeralPool();
    return ephPool.getEphemeralAddressInTxCount(index);
  }

  public async getEphemeralAddressOutTxCount(index: number): Promise<number> {
    const ephPool = this.zpState().ephemeralPool();
    return ephPool.getEphemeralAddressOutTxCount(index);
  }

  public getEphemeralAddressPrivateKey(index: number): string {
    const ephPool = this.zpState().ephemeralPool();
    return ephPool.getEphemeralAddressPrivateKey(index);
  }

  // ----------------=========< Statistic Routines >=========-----------------
  // | Calculating sync time                                                 |
  // -------------------------------------------------------------------------
  public getStatFullSync(): SyncStat | undefined {
    const stats = this.zpState().syncStatistics();
    for (const aStat of stats) {
      if (aStat.fullSync) {
        return aStat;
      }
    }

    return undefined; // relevant stat doesn't found
  }

  // in milliseconds
  public getAverageTimePerTx(): number | undefined {
    const stats = this.zpState().syncStatistics();
    if (stats.length > 0) {
      return stats.map((aStat) => aStat.timePerTx).reduce((acc, cur) => acc + cur) / stats.length;
    }

    return undefined; // relevant stat doesn't found
  }
  
}
