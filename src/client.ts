import { Proof, ITransferData, IWithdrawData, StateUpdate, TreeNode, IAddressComponents } from 'libzkbob-rs-wasm-web';
import { Chains, Pools, SnarkConfigParams, ClientConfig,
        AccountConfig, accountId, ProverMode, DepositType } from './config';
import { ethAddrToBuf, toCompactSignature, truncateHexPrefix,
          toTwosComplementHex, bufToHex
        } from './utils';
import { SyncStat, ZkBobState } from './state';
import { CALLDATA_BASE_LENGTH, TxType, estimateCalldataLength, txTypeToString } from './tx';
import { CONSTANTS } from './constants';
import { HistoryRecord, HistoryRecordState, HistoryTransactionType, ComplianceHistoryRecord } from './history'
import { EphemeralAddress } from './ephemeral';
import { 
  InternalError, PoolJobError, RelayerJobError, SignatureError, TxDepositAllowanceTooLow, TxDepositDeadlineExpiredError,
  TxInsufficientFundsError, TxInvalidArgumentError, TxLimitError, TxProofError, TxSmallAmount, TxSwapTooHighError
} from './errors';
import { JobInfo, RelayerFee } from './services/relayer';
import { TreeState, ZkBobProvider } from './client-provider';
import { DepositData, SignatureRequest } from './signers/abstract-signer';
import { DepositSignerFactory } from './signers/signer-factory'
import { PERMIT2_CONTRACT } from './signers/permit2-signer';
import { DirectDeposit, DirectDepositProcessor, DirectDepositType } from './dd';

import { isHexPrefixed } from '@ethereumjs/util';
import { isAddress } from 'web3-utils';
import { wrap } from 'comlink';
import { PreparedTransaction } from './networks/network';

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

// Configuration for the transfer/withdrawal transactions used in multi-tx scheme
// Supporting for multi-note transfers
// Describes single transaction configuration
export interface TransferConfig {
  inNotesBalance: bigint;
  outNotes: TransferRequest[];  // tx notes (without fee)
  calldataLength: number; // used to estimate fee
  fee: bigint;  // absolute transaction fee (pool resolution)
  accountLimit: bigint;  // minimum account remainder after transaction
                         // (for future use, e.g. complex multi-tx transfers, default: 0)
}

// Used in the fee estimation methods
export interface FeeAmount { // all values are in Gwei
  total: bigint;    // total fee estimation (in pool resolution)
  txCnt: number;      // multitransfer case (== 1 for regular tx)
  calldataTotalLength: number; // started from selector, summ for all txs
  relayerFee: RelayerFee;  // fee from relayer which was used during estimation
  insufficientFunds: boolean; // true when the local balance is insufficient for requested tx amount
}

export class ZkBobClient extends ZkBobProvider {
  // States for the current account in the different pools
  private zpStates: { [poolAlias: string]: ZkBobState } = {};
  // Holds gift cards temporary states (id - gift card unique ID based on sk and pool)
  private auxZpStates: { [id: string]: ZkBobState } = {};
  // Direct deposit processors are used to create DD and fetch DD pending txs
  private ddProcessors: { [poolAlias: string]: DirectDepositProcessor } = {};
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
      txParamsHash = await this.relayer().txParamsHash();
    } catch (err) {
      console.warn(`Cannot fetch tx parameters hash from the relayer (${err.message})`);
    }
  
    let worker: any;
  
    worker = wrap(new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }));
      await worker.initWasm(
        snarkParams.transferParamsUrl,
        txParamsHash, 
        snarkParams.transferVkUrl,
        forcedMultithreading
      );
  
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
    const oldPoolAlias = super.currentPool();
    this.freePoolState(oldPoolAlias);

    // set active pool for accountless mode, activate network backend
    super.switchToPool(poolAlias);
    const newPoolAlias = super.currentPool();

    // the following values needed to initialize ZkBobState
    const pool = this.pool();
    const denominator = await this.denominator();
    const poolId = await this.poolId();
    const network = this.network();
    const networkName = this.networkName();

    if (this.account) {
      this.monitoredJobs.clear();
      await Promise.all(this.jobsMonitors.values());
      this.jobsMonitors.clear();

      this.account.pool = newPoolAlias;
      this.account.birthindex = birthindex;
      if (this.account.birthindex == -1) {  // -1 means `account born right now`
        try { // fetch current birthindex right away
          let curIndex = Number((await this.relayer().info()).deltaIndex);
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

      const state = await ZkBobState.create(
          this.account.sk,
          this.account.birthindex,
          networkName,
          network.getRpcUrl(),
          denominator,
          poolId,
          pool.tokenAddress,
          this.worker
        );
      this.zpStates[newPoolAlias] = state;
      this.ddProcessors[newPoolAlias] = new DirectDepositProcessor(pool, network, state)

      console.log(`Pool and user account was switched to ${newPoolAlias} successfully`);
    } else {
      console.log(`Pool was switched to ${newPoolAlias} but account is not set yet`);
    }
  }

  public hasAccount(): boolean {
    return this.account && this.zpStates[this.curPool] ? true : false;
  }

  // return current state if poolAlias absent
  private zpState(poolAlias: string | undefined = undefined): ZkBobState {
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
    if (giftCardAcc.pool != this.currentPool()) {
      throw new InternalError(`The current pool (${this.currentPool()}) doesn't match gift-card's one (${giftCardAcc.pool})`);
    }

    const accId = accountId(giftCardAcc);
    if (!this.auxZpStates[accId]) {
      // create gift-card auxiliary state if needed
      const networkName = this.networkName();
      const poolId = await this.poolId();
      const giftCardState = await ZkBobState.createNaked(giftCardAcc.sk, giftCardAcc.birthindex, networkName, poolId, this.worker);

      // state will be removed after gift card redemption or on logout
      this.auxZpStates[accId] = giftCardState;
    }

    // update gift card state
    const giftCardState = this.auxZpStates[accId];
    const relayer = this.relayer();
    const readyToTransact = await giftCardState.updateState(
      relayer,
      async (index) => (await this.getPoolState(index)).root,
      await this.coldStorageConfig(),
      this.coldStorageBaseURL(),
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

    return await this.zpState().history?.getAllHistory() ?? [];
  }

  public async getPendingDDs(): Promise<DirectDeposit[]> {
    return this.ddProcessor().pendingDirectDeposits();
  }

  // Generate compliance report
  public async getComplianceReport(
    fromTimestamp: number | null,
    toTimestamp: number | null,
    updateState: boolean = true,
  ): Promise<ComplianceHistoryRecord[]> {
    if (updateState) {
      await this.getAllHistory();
    }

    const sk = this.account?.sk;
    if (!sk) {
      throw new InternalError('Account is not set');
    }
    
    return await this.zpState().history?.getComplianceReport(fromTimestamp, toTimestamp) ?? [];     

  }

  // ------------------=========< Service Routines >=========-------------------
  // | Methods for creating and sending transactions in different modes        |
  // ---------------------------------------------------------------------------

  // Generate shielded address to receive funds
  public async generateAddress(): Promise<string> {;
    return this.zpState().generateAddress();
  }

  public async generateUniversalAddress(): Promise<string> {;
    return this.zpState().generateUniversalAddress();
  }

  // Generate address with the specified seed
  public async generateAddressForSeed(seed: Uint8Array): Promise<string> {
    return this.zpState().generateAddressForSeed(seed);
  }

  // Is address valid (correct checksum and current pool)
  public async verifyShieldedAddress(address: string): Promise<boolean> {
    return this.zpState().verifyShieldedAddress(address);
  }

  // Returns true if shieldedAddress belogs to the user's account and the current pool
  public async isMyAddress(shieldedAddress: string): Promise<boolean> {
    return this.zpState().isOwnAddress(shieldedAddress);
  }

  public async addressInfo(shieldedAddress: string): Promise<IAddressComponents> {
    return this.zpState().parseAddress(shieldedAddress);
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
            const retrievedReason = (await this.network().getTxRevertReason(job.txHash));
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

  // Universal deposit method based on permit or approve scheme
  // User should sign typed data to allow contract receive his tokens
  // Returns jobId from the relayer or throw an Error
  public async deposit(
    amountGwei: bigint,
    signatureCallback: (request: SignatureRequest) => Promise<string>,
    fromAddress: string,
    relayerFee?: RelayerFee,
  ): Promise<string> {
    const pool = this.pool();
    const relayer = this.relayer();
    const state = this.zpState();

    const minTx = await this.minTxAmount();
    if (amountGwei < minTx) {
      throw new TxSmallAmount(amountGwei, minTx);
    }

    const limits = await this.getLimits(fromAddress);
    if (amountGwei > limits.deposit.total) {
      throw new TxLimitError(amountGwei, limits.deposit.total);
    }

    await this.updateState();

    // Fee estimating
    const usedFee = relayerFee ?? await this.getRelayerFee();
    const txType = pool.depositScheme == DepositType.Approve ? TxType.Deposit : TxType.BridgeDeposit;
    let estimatedFee = await this.feeEstimateInternal([amountGwei], txType, usedFee, false, true);
    const feeGwei = estimatedFee.total;

    const deadline = Math.floor(Date.now() / 1000) + PERMIT_DEADLINE_INTERVAL;

    // Creating raw deposit transaction object
    let txData;
    if (txType == TxType.Deposit) {
      // deposit via approve (deprecated)
      txData = await state.createDeposit({
        amount: (amountGwei + feeGwei).toString(),
        fee: feeGwei.toString(),
      });
    } else {
      // deposit via permit: permit\permitv2\auth
      txData = await state.createDepositPermittable({ 
        amount: (amountGwei + feeGwei).toString(),
        fee: feeGwei.toString(),
        deadline: String(deadline),
        holder: ethAddrToBuf(fromAddress)
      });
    }

    // Preparing signature request and sending it via callback
    const dataToSign: DepositData = {
      tokenAddress: pool.tokenAddress,
      owner: fromAddress,
      spender: pool.poolAddress,
      amount: await this.shieldedAmountToWei(amountGwei + feeGwei),
      deadline: BigInt(deadline),
      nullifier: '0x' + toTwosComplementHex(BigInt(txData.public.nullifier), 32)
    }
    const depositSigner = DepositSignerFactory.createSigner(this.network(), pool.depositScheme);
    await depositSigner.checkIsDataValid(dataToSign); // may throw an error in case of the owner isn't prepared for requested deposit scheme
    const signReq = await depositSigner.buildSignatureRequest(dataToSign);
    let signature = await signatureCallback(signReq);
    signature = toCompactSignature(truncateHexPrefix(signature));

    // Checking signature correct (corresponded with declared address)
    const claimedAddr = `0x${bufToHex(ethAddrToBuf(fromAddress))}`;
    let recoveredAddr;
    try {
      recoveredAddr = await depositSigner.recoverAddress(dataToSign, signature);
    } catch (err) {
      throw new SignatureError(`Cannot recover address from the provided signature. Error: ${err.message}`);
    }
    if (recoveredAddr != claimedAddr) {
      throw new SignatureError(`The address recovered from the permit signature ${recoveredAddr} doesn't match the declared one ${claimedAddr}`);
    }

    // We should also check deadline here because the user could introduce great delay
    if (Math.floor(Date.now() / 1000) > deadline - PERMIT_DEADLINE_THRESHOLD) {
      throw new TxDepositDeadlineExpiredError(deadline);
    }

    // Proving transaction
    const startProofDate = Date.now();
    const txProof = await this.proveTx(txData.public, txData.secret);
    const proofTime = (Date.now() - startProofDate) / 1000;
    console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

    // Checking the depositor's token balance before sending tx
    let balance: bigint;
    try {
      const balanceWei = await this.network().getTokenBalance(pool.tokenAddress, claimedAddr);
      balance = await this.weiToShieldedAmount(balanceWei);
    } catch (err) {
      throw new InternalError(`Unable to fetch depositor's balance. Error: ${err.message}`);
    }
    if (balance < (amountGwei + feeGwei)) {
      throw new TxInsufficientFundsError(amountGwei, balance);
    }

    const tx = { txType, memo: txData.memo, proof: txProof, depositSignature: signature };
    this.assertCalldataLength(tx, estimatedFee.calldataTotalLength);
    const jobId = await relayer.sendTransactions([tx]);
    this.startJobMonitoring(jobId);

    // Temporary save transaction in the history module (to prevent history delays)
    const ts = Math.floor(Date.now() / 1000);
    const rec = await HistoryRecord.deposit(fromAddress, amountGwei, feeGwei, ts, '0', true);
    state.history?.keepQueuedTransactions([rec], jobId);

    return jobId;
  }


  public async depositEphemeral(
    amountGwei: bigint,
    ephemeralIndex: number,
    relayerFee?: RelayerFee,
  ): Promise<string> {
    const state = this.zpState();
    const fromAddress = await state.ephemeralPool().getEphemeralAddress(ephemeralIndex);

    // we should check token balance here since the library is fully responsible
    // for ephemeral address in contrast to depositing from external user's address
    const pool = await this.pool();
    const actualFee = relayerFee ?? await this.getRelayerFee();
    const txType = pool.depositScheme == DepositType.Approve ? TxType.Deposit : TxType.BridgeDeposit;
    const neededFee = await this.feeEstimateInternal([amountGwei], txType, actualFee, true, true);
    if(fromAddress.tokenBalance < amountGwei + neededFee.total) {
      throw new TxInsufficientFundsError(amountGwei + neededFee.total, fromAddress.tokenBalance);
    }

    if (pool.depositScheme == DepositType.PermitV2 || pool.depositScheme == DepositType.Approve) {
      const spender = pool.depositScheme == DepositType.PermitV2 ? PERMIT2_CONTRACT : pool.poolAddress;
      const curAllowance = await state.ephemeralPool().allowance(ephemeralIndex, spender);
      if (curAllowance < amountGwei + neededFee.total) {
        console.log(`Approving tokens for contract ${spender}...`);
        const maxTokensAmount = 2n ** 256n - 1n;
        const txHash = await state.ephemeralPool().approve(ephemeralIndex, spender, maxTokensAmount);
        console.log(`Tx hash for the approve transaction: ${txHash}`);
      }
    }

    return this.deposit(amountGwei, async (signingRequest) => {
      const pool = this.pool();
      const state = this.zpState();

      const privKey = this.getEphemeralAddressPrivateKey(ephemeralIndex);

      const depositSigner = DepositSignerFactory.createSigner(this.network(), pool.depositScheme);
      return depositSigner.signRequest(privKey, signingRequest);
    }, fromAddress.address, actualFee);
  }

  // Deposit funds 
  public async directDeposit(
    type: DirectDepositType,
    fromAddress: string,
    amount: bigint, // in pool resolution
    sendTxCallback: (tx: PreparedTransaction) => Promise<string>, // txHash
  ): Promise<void> {
    const pool = this.pool();
    const processor = this.ddProcessor();
    const ddQueueAddress = await processor.getQueueContract();
    const zkAddress = await this.generateAddress();

    const limits = await this.getLimits(fromAddress);
    if (amount > limits.dd.total) {
      throw new TxLimitError(amount, limits.dd.total);
    }

    const fee = await processor.getFee();
    let fullAmountNative = await this.shieldedAmountToWei(amount + fee);

    if (type == DirectDepositType.Token) {
      // For the token-based DD we should check allowance first
      const curAllowance = await this.network().allowance(pool.tokenAddress, fromAddress, ddQueueAddress);
      if (curAllowance < fullAmountNative) {
        throw new TxDepositAllowanceTooLow(fullAmountNative, curAllowance, ddQueueAddress);
      }
    }
    
    const rawTx = await processor.prepareDirectDeposit(type, zkAddress, fullAmountNative, fromAddress, true);
    const txHash = await sendTxCallback(rawTx);

    console.log(`DD transaction sent: ${txHash}`)

    return;
  }

  // Transfer shielded funds to the shielded address
  // This method can produce several transactions in case of insufficient input notes (constants::IN per tx)
  // Returns jobIds from the relayer or throw an Error
  public async transferMulti(transfers: TransferRequest[], relayerFee?: RelayerFee): Promise<string[]> {
    const state = this.zpState();
    const relayer = this.relayer();

    await Promise.all(transfers.map(async (aTx) => {
      if (!await this.verifyShieldedAddress(aTx.destination)) {
        throw new TxInvalidArgumentError('Invalid address. Expected a shielded address.');
      }

      const minTx = await this.minTxAmount();
      if (aTx.amountGwei < minTx) {
        throw new TxSmallAmount(aTx.amountGwei, minTx);
      }
    }));

    const usedFee = relayerFee ?? await this.getRelayerFee();
    const txParts = await this.getTransactionParts(TxType.Transfer, transfers, usedFee);

    if (txParts.length == 0) {
      const available = await this.calcMaxAvailableTransfer(TxType.Transfer, false);
      const amounts = transfers.map((aTx) => aTx.amountGwei);
      const totalAmount = amounts.reduce((acc, cur) => acc + cur, BigInt(0));
      const feeEst = await this.feeEstimateInternal(amounts, TxType.Transfer, usedFee, false, true);
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
      this.assertCalldataLength(transaction, onePart.calldataLength);

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
  // relayerFee - fee from the relayer (request one if undefined)
  // Returns jobId from the relayer or throw an Error
  public async withdrawMulti(address: string, amountGwei: bigint, swapAmount: bigint, relayerFee?: RelayerFee): Promise<string[]> {
    const relayer = this.relayer();
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

    const supportedSwapAmount = await this.maxSupportedTokenSwap();
    if (swapAmount > supportedSwapAmount) {
      throw new TxSwapTooHighError(swapAmount, supportedSwapAmount);
    }

    const minTx = await this.minTxAmount();
    if (amountGwei < minTx) {
      throw new TxSmallAmount(amountGwei, minTx);
    }

    const limits = await this.getLimits(address);
    if (amountGwei > limits.withdraw.total) {
      throw new TxLimitError(amountGwei, limits.withdraw.total);
    }

    const usedFee = relayerFee ?? await this.getRelayerFee();
    const txParts = await this.getTransactionParts(TxType.Withdraw, [{amountGwei, destination: address}], usedFee);

    if (txParts.length == 0) {
      const available = await this.calcMaxAvailableTransfer(TxType.Withdraw, false);
      const feeEst = await this.feeEstimateInternal([amountGwei], TxType.Withdraw, usedFee, false, true);
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
          native_amount: swapAmount.toString(),
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
      this.assertCalldataLength(transaction, onePart.calldataLength);

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
    const fee = await this.atomicTxFee(TxType.Transfer);
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
    const txProof: Proof = await this.proveTx(txData.public, txData.secret, giftCardAcc.proverMode);
    const proofTime = (Date.now() - startProofDate) / 1000;
    console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

    const transaction = {memo: txData.memo, proof: txProof, txType: TxType.Transfer};
    this.assertCalldataLength(transaction, estimateCalldataLength(TxType.Transfer, 1));

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

  private assertCalldataLength(txToRelayer: any, estimatedLen: number) {
    let factLen = CALLDATA_BASE_LENGTH + txToRelayer.memo.length / 2;
    if (txToRelayer.depositSignature) {
      factLen += txToRelayer.depositSignature.length / 2;
    }

    if (factLen != estimatedLen) {
      throw new InternalError(`Calldata length estimation error: est ${estimatedLen}, actual ${factLen} bytes`);
    }
  }

  // ------------------=========< Transaction configuration >=========-------------------
  // | These methods includes fee estimation, multitransfer estimation and other inform |
  // | functions.                                                                       |
  // ------------------------------------------------------------------------------------

  // Fee can depends on tx amount for multitransfer transactions,
  // that's why you should specify it here for general case
  // This method also supposed that in some cases fee can depends on tx amount in future
  // Currently any deposit isn't depends of amount (txCnt is always 1 and transfersGwei ignored)
  // There are two extra states in case of insufficient funds for requested token amount:
  //  1. txCnt contains number of transactions for maximum available transfer
  //  2. txCnt can't be less than 1 (e.g. when balance is less than atomic fee)
  public async feeEstimate(transfersGwei: bigint[], txType: TxType, updateState: boolean = true): Promise<FeeAmount> {
    const relayerFee = await this.getRelayerFee();
    return this.feeEstimateInternal(transfersGwei, txType, relayerFee, updateState, true);
  }

  private async feeEstimateInternal(
    transfersGwei: bigint[],
    txType: TxType,
    relayerFee: RelayerFee,
    updateState: boolean,
    roundFee: boolean
  ): Promise<FeeAmount> {
    let txCnt = 1;
    let total = 0n;
    let calldataTotalLength = 0;
    let insufficientFunds = false;

    if (txType === TxType.Transfer || txType === TxType.Withdraw) {
      // we set allowPartial flag here to get parts anywhere
      const requests: TransferRequest[] = transfersGwei.map((gwei) => { return {amountGwei: gwei, destination: NULL_ADDRESS} });  // destination address is ignored for estimation purposes
      const parts = await this.getTransactionParts(txType, requests, relayerFee, updateState, true);
      const totalBalance = await this.getTotalBalance(false);

      const totalSumm = parts
        .map((p) => p.outNotes.reduce((acc, cur) => acc + cur.amountGwei, BigInt(0)))
        .reduce((acc, cur) => acc + cur, 0n);

      const totalRequested = transfersGwei.reduce((acc, cur) => acc + cur, BigInt(0));

      if (parts.length > 0) {
        txCnt = parts.length;
        for (let i = 0; i < txCnt; i++) {
          const curTxType = i < txCnt - 1 ? TxType.Transfer : txType;
          const curFee = roundFee ? (await this.roundFee(parts[i].fee)) : parts[i].fee;
          total += curFee;
          calldataTotalLength += estimateCalldataLength(curTxType, curTxType == TxType.Transfer ? parts[i].outNotes.length : 0);
        }
      } else { // if we haven't funds for atomic fee - suppose we can make at least one tx
        txCnt = 1;
        total = await this.atomicTxFee(txType);
        calldataTotalLength = estimateCalldataLength(txType, txType == TxType.Transfer ? transfersGwei.length : 0);
      }

      insufficientFunds = (totalSumm < totalRequested || totalSumm + total > totalBalance) ? true : false;
    } else {
      // Deposit and BridgeDeposit cases are independent on the user balance
      // Fee got from the native coins, so any deposit can be make within single tx
      calldataTotalLength = estimateCalldataLength(txType, 0);
      total = relayerFee.fee + relayerFee.oneByteFee * BigInt(calldataTotalLength);
      total = roundFee ? await this.roundFee(total) : total;
    }

    return {total, txCnt, calldataTotalLength, relayerFee, insufficientFunds};
  }

  // Account + notes balance excluding fee needed to transfer or withdraw it
  // TODO: need to optimize for edge cases (account limit calculating)
  public async calcMaxAvailableTransfer(txType: TxType, updateState: boolean = true): Promise<bigint> {
    if (txType != TxType.Transfer && txType != TxType.Withdraw) {
      throw new InternalError(`Attempting to invoke \'calcMaxAvailableTransfer\' for ${txTypeToString(txType)} tx (only transfer\\withdraw are supported)`);
    }

    const state = this.zpState();
    if (updateState) {
      await this.updateState();
    }

    const relayerFee = await this.getRelayerFee();
    const aggregateTxLen = BigInt(estimateCalldataLength(TxType.Transfer, 0)); // aggregation txs are always transfers
    const finalTxLen = BigInt(estimateCalldataLength(txType, txType == TxType.Transfer ? 1 : 0));
    const aggregateTxFee = await this.roundFee(relayerFee.fee + aggregateTxLen * relayerFee.oneByteFee);
    const finalTxFee = await this.roundFee(relayerFee.fee + finalTxLen * relayerFee.oneByteFee);

    const groupedNotesBalances = await this.getGroupedNotes();
    let accountBalance = await state.accountBalance();

    let maxAmount = accountBalance > aggregateTxFee ? accountBalance - aggregateTxFee : 0n;
    for (var i = 0; i < groupedNotesBalances.length; i++) { 
      const inNotesBalance = groupedNotesBalances[i];
      const txFee = (i == groupedNotesBalances.length - 1) ? finalTxFee : aggregateTxFee;
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
    txType: TxType,
    transfers: TransferRequest[],
    relayerFee: RelayerFee,
    updateState: boolean = true,
    allowPartial: boolean = false,
  ): Promise<Array<TransferConfig>> {

    if (txType != TxType.Transfer && txType != TxType.Withdraw) {
      throw new InternalError(`Attempting to invoke \'getTransactionParts\' for ${txTypeToString(txType)} tx (only transfer\\withdraw are supported)`);
    }

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
      txParts = await this.tryToPrepareTransfers(txType, accountBalance, relayerFee, groupedNotesBalances.slice(i, i + aggregatedTransfers.length), aggregatedTransfers);
      if (txParts.length == aggregatedTransfers.length) {
        // We are able to perform all txs starting from this index
        return aggregationParts.concat(txParts);
      }

      if (groupedNotesBalances.length == 0) {
        // We can't aggregate notes if we doesn't have one
        break;
      }

      const calldataLength = estimateCalldataLength(TxType.Transfer, 0);
      const fee = await this.roundFee(relayerFee.fee + relayerFee.oneByteFee * BigInt(calldataLength));

      const inNotesBalance = groupedNotesBalances[i];
      if (accountBalance + inNotesBalance < fee) {
        // We cannot collect amount to cover tx fee. There are 2 cases:
        // insufficient balance or unoperable notes configuration
        break;
      }

      aggregationParts.push({
        inNotesBalance,
        outNotes: [],
        calldataLength,
        fee,
        accountLimit: BigInt(0)
      });
      accountBalance += BigInt(inNotesBalance) - fee;
      
      i++;
    } while (i < groupedNotesBalances.length)

    return allowPartial ? aggregationParts.concat(txParts) : [];
  }

  // try to prepare transfer configs without extra aggregation transactions
  // (using just account balance and notes collected in these txs)
  private async tryToPrepareTransfers(
    txType: TxType,
    balance: bigint,
    relayerFee: RelayerFee,
    groupedNotesBalances: Array<bigint>,
    transfers: MultinoteTransferRequest[]
  ): Promise<Array<TransferConfig>> {
    let accountBalance = balance;
    let parts: Array<TransferConfig> = [];
    for (let i = 0; i < transfers.length; i++) {
      const inNotesBalance = i < groupedNotesBalances.length ? groupedNotesBalances[i] : BigInt(0);

      const numOfNotes = (txType == TxType.Transfer) ? transfers[i].requests.length : 0;
      const calldataLength = estimateCalldataLength(txType, numOfNotes);
      const fee = await this.roundFee(relayerFee.fee + relayerFee.oneByteFee * BigInt(calldataLength));

      if (accountBalance + inNotesBalance < transfers[i].totalAmount + fee) {
        // We haven't enough funds to perform such tx
        break;
      }

      parts.push({
        inNotesBalance,
        outNotes: transfers[i].requests,
        calldataLength,
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
    if (mode != ProverMode.Delegated) {
        this.worker.loadTxParams();
    }
    await super.setProverMode(mode);
  }

  // Universal proving routine
  private async proveTx(pub: any, sec: any, forcedMode: ProverMode | undefined = undefined): Promise<any> {
    const proverMode = forcedMode ?? this.getProverMode();
    const prover = this.prover()
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
    return await this.zpState().updateState(
      this.relayer(),
      async (index) => (await this.getPoolState(index)).root,
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

  // ------------------=========< Direct Deposits >=========------------------
  // | Calculating sync time                                                 |
  // -------------------------------------------------------------------------

  protected ddProcessor(): DirectDepositProcessor {
    const proccessor = this.ddProcessors[this.curPool];
    if (!proccessor) {
        throw new InternalError(`No direct deposit processer initialized for the pool ${this.curPool}`);
    }

    return proccessor;
  }

  public async directDepositContract(): Promise<string> {
      return this.ddProcessor().getQueueContract();
  }

  public async directDepositFee(): Promise<bigint> {
    return this.ddProcessor().getFee();
  }
  
}