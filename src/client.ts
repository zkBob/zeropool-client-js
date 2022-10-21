import { SnarkParams, Tokens } from './config';
import { ethAddrToBuf, toCompactSignature, truncateHexPrefix, toTwosComplementHex, addressFromSignature } from './utils';
import { ZkBobState } from './state';
import { TxType } from './tx';
import { NetworkBackend } from './networks/network';
import { CONSTANTS } from './constants';
import { HistoryRecord, HistoryRecordState, HistoryTransactionType } from './history'

import { 
  validateAddress, Output, Proof, DecryptedMemo, ITransferData, IWithdrawData,
  ParseTxsResult, StateUpdate, IndexedTx 
} from 'libzkbob-rs-wasm-web';

import { 
  NetworkError, RelayerError, RelayerJobError, TxDepositDeadlineExpiredError,
  TxInsufficientFundsError, TxInvalidArgumentError, TxLimitError, TxProofError, TxSmallAmount
} from './errors';

const MIN_TX_AMOUNT = BigInt(50000000);
const DEFAULT_TX_FEE = BigInt(100000000);
const BATCH_SIZE = 1000;
const PERMIT_DEADLINE_INTERVAL = 1200;   // permit deadline is current time + 20 min
const PERMIT_DEADLINE_THRESHOLD = 300;   // minimum time to deadline before tx proof calculation and sending (5 min)

export interface RelayerInfo {
  root: string;
  optimisticRoot: string;
  deltaIndex: bigint;
  optimisticDeltaIndex: bigint;
}
const isRelayerInfo = (obj: any): obj is RelayerInfo => {
  return typeof obj === 'object' && obj !== null &&
    obj.hasOwnProperty('root') && typeof obj.root === 'string' &&
    obj.hasOwnProperty('optimisticRoot') && typeof obj.optimisticRoot === 'string' &&
    obj.hasOwnProperty('deltaIndex') && typeof obj.deltaIndex === 'number' &&
    obj.hasOwnProperty('optimisticDeltaIndex') && typeof obj.optimisticDeltaIndex === 'number';
}

export interface BatchResult {
  txCount: number;
  maxMinedIndex: number;
  maxPendingIndex: number;
  state: Map<number, StateUpdate>;  // key: first tx index, 
                                    // value: StateUpdate object (notes, accounts, leafs and comminments)
}

export interface TxAmount { // all values are in Gwei
  amount: bigint;  // tx amount (without fee)
  fee: bigint;  // fee 
  accountLimit: bigint;  // minimum account remainder after transaction
                         // (used for complex multi-tx transfers, default: 0)
}

export interface TxToRelayer {
  txType: TxType;
  memo: string;
  proof: Proof;
  depositSignature?: string
}

export interface JobInfo {
  state: string;
  txHash: string[];
  createdOn: number;
  finishedOn?: number;
  failedReason?: string;
}
const isJobInfo = (obj: any): obj is JobInfo => {
  return typeof obj === 'object' && obj !== null &&
    obj.hasOwnProperty('state') && typeof obj.state === 'string' &&
    obj.hasOwnProperty('txHash') && (!obj.txHash || Array.isArray(obj.txHash)) &&
    obj.hasOwnProperty('createdOn') && typeof obj.createdOn === 'number';
}

export interface FeeAmount { // all values are in Gwei
  total: bigint;    // total fee
  totalPerTx: bigint; // multitransfer case (== total for regular tx)
  txCnt: number;      // multitransfer case (== 1 for regular tx)
  relayer: bigint;  // relayer fee component
  l1: bigint;       // L1 fee component
  insufficientFunds: boolean; // true when the local balance is insufficient for requested tx amount
}

export interface Limit { // all values are in Gwei
  total: bigint;
  available: bigint;
}

export interface PoolLimits { // all values are in Gwei
  deposit: {
    total: bigint;
    components: {
      singleOperation: bigint;
      daylyForAddress: Limit;
      daylyForAll: Limit;
      poolLimit: Limit;
    };
  }
  withdraw: {
    total: bigint;
    components: {
      daylyForAll: Limit;
    };
  }
  tier: number;
}

export interface LimitsFetch { 
  deposit: {
    singleOperation: bigint;
    daylyForAddress: Limit;
    daylyForAll: Limit;
    poolLimit: Limit;
  }
  withdraw: {
    daylyForAll: Limit;
  }
  tier: number;
}

export interface ClientConfig {
  /** Spending key. */
  sk: Uint8Array;
  /** A map of supported tokens (token address => token params). */
  tokens: Tokens;
  /** Loaded zkSNARK paramaterers. */
  snarkParams: SnarkParams;
  /** A worker instance acquired through init() function of this package. */
  worker: any;
  /** The name of the network is only used for storage. */
  networkName: string | undefined;
  network: NetworkBackend;
}

export class ZkBobClient {
  private zpStates: { [tokenAddress: string]: ZkBobState };
  private worker: any;
  private snarkParams: SnarkParams;
  private tokens: Tokens;
  private config: ClientConfig;
  private relayerFee: bigint | undefined; // in Gwei, do not use directly, use getRelayerFee method instead
  private updateStatePromise: Promise<boolean> | undefined;

  public static async create(config: ClientConfig): Promise<ZkBobClient> {
    const client = new ZkBobClient();
    client.zpStates = {};
    client.worker = config.worker;
    client.snarkParams = config.snarkParams;
    client.tokens = config.tokens;
    client.config = config;

    client.relayerFee = undefined;

    let networkName = config.networkName;
    if (!networkName) {
      networkName = config.network.defaultNetworkName();
    }

    for (const [address, token] of Object.entries(config.tokens)) {
      const denominator = await config.network.getDenominator(token.poolAddress);
      client.zpStates[address] = await ZkBobState.create(config.sk, networkName, config.network.getRpcUrl(), denominator);
    }

    return client;
  }

  public free(): void {
    for (let state of Object.values(this.zpStates)) {
      state.free();
    }
  }

  // ------------------=========< Balances and History >=========-------------------
  // | Quering shielded balance and history records                                |
  // -------------------------------------------------------------------------------

  // Pool contract using default denominator 10^9
  // i.e. values less than 1 Gwei are supposed equals zero
  // But this is deployable parameter so this method are using to retrieve it
  public getDenominator(tokenAddress: string): bigint {
    return this.zpStates[tokenAddress].denominator;
  }

  // Convert native pool amount to the base units
  public shieldedAmountToWei(tokenAddress, amountGwei: bigint): bigint {
    return amountGwei * this.zpStates[tokenAddress].denominator
  }
  
  // Convert base units to the native pool amount
  public weiToShieldedAmount(tokenAddress, amountWei: bigint): bigint {
    return amountWei / this.zpStates[tokenAddress].denominator
  }

  // Get account + notes balance in Gwei
  // [with optional state update]
  public async getTotalBalance(tokenAddress: string, updateState: boolean = true): Promise<bigint> {
    if (updateState) {
      await this.updateState(tokenAddress);
    }

    return this.zpStates[tokenAddress].getTotalBalance();
  }

  // Get total balance with components: account and notes
  // [with optional state update]
  // Returns [total, account, note] in Gwei
  public async getBalances(tokenAddress: string, updateState: boolean = true): Promise<[bigint, bigint, bigint]> {
    if (updateState) {
      await this.updateState(tokenAddress);
    }

    return this.zpStates[tokenAddress].getBalances();
  }

  // Get total balance including transactions in optimistic state [in Gwei]
  // There is no option to prevent state update here,
  // because we should always monitor optimistic state
  public async getOptimisticTotalBalance(tokenAddress: string, updateState: boolean = true): Promise<bigint> {

    const confirmedBalance = await this.getTotalBalance(tokenAddress, updateState);
    const historyRecords = await this.getAllHistory(tokenAddress, updateState);

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

          default: break;
        }
      }
    }

    return confirmedBalance + pendingDelta;
  }

  // Get history records
  public async getAllHistory(tokenAddress: string, updateState: boolean = true): Promise<HistoryRecord[]> {
    if (updateState) {
      await this.updateState(tokenAddress);
    }

    return await this.zpStates[tokenAddress].history.getAllHistory();
  }

  // ------------------=========< Service Routines >=========-------------------
  // | Methods for creating and sending transactions in different modes        |
  // ---------------------------------------------------------------------------

  // Generate shielded address to receive funds
  public generateAddress(tokenAddress: string): string {
    const state = this.zpStates[tokenAddress];
    return state.account.generateAddress();
  }

  // Waiting while relayer process the jobs set
  public async waitJobsCompleted(tokenAddress: string, jobIds: string[]): Promise<{jobId: string, txHash: string}[]> {
    let promises = jobIds.map(async (jobId) => {
      const txHashes: string[] = await this.waitJobCompleted(tokenAddress, jobId);
      return { jobId, txHash: txHashes[0] };
    });
    
    return Promise.all(promises);
  }

  // Waiting while relayer process the job
  // return transaction(s) hash(es) on success or throw an error
  public async waitJobCompleted(tokenAddress: string, jobId: string): Promise<string[]> {
    const token = this.tokens[tokenAddress];
    const state = this.zpStates[tokenAddress];

    const INTERVAL_MS = 1000;
    let hashes: string[];
    while (true) {
      const job = await this.getJob(token.relayerUrl, jobId);

      if (job === null) {
        throw new RelayerJobError(Number(jobId), 'not found');
      } else if (job.state === 'failed')  {
        const relayerReason = job.failedReason !== undefined ? job.failedReason : 'unknown reason';
        state.history.setQueuedTransactionFailedByRelayer(jobId, relayerReason);
        throw new RelayerJobError(Number(jobId), relayerReason);
      } else if (job.state === 'completed') {
        hashes = job.txHash;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }

    state.history.setTxHashesForQueuedTransactions(jobId, hashes);
    

    console.info(`Transaction [job ${jobId}] successful: ${hashes.join(", ")}`);

    return hashes;
  }

  // Waiting while relayer includes the job transaction in the optimistic state
  // return transaction(s) hash(es) on success or throw an error
  // TODO: change job state logic after relayer upgrade! <look for a `queued` state>
  public async waitJobQueued(tokenAddress: string, jobId: string): Promise<boolean> {
    const token = this.tokens[tokenAddress];
    const state = this.zpStates[tokenAddress];

    const INTERVAL_MS = 1000;
    let hashes: string[];
    while (true) {
      const job = await this.getJob(token.relayerUrl, jobId);
      
      if (job === null) {
        throw new RelayerJobError(Number(jobId), 'not found');
      } else if (job.state === 'failed') {
        const relayerReason = job.failedReason !== undefined ? job.failedReason : 'unknown reason';
        state.history.setQueuedTransactionFailedByRelayer(jobId, relayerReason);
        throw new RelayerJobError(Number(jobId), job.failedReason !== undefined ? job.failedReason : 'unknown reason');
      } else if (job.state === 'completed') {
        hashes = job.txHash;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
    }

    console.info(`Transaction [job ${jobId}] in optimistic state now`);

    return true;
  }

  // ------------------=========< Making Transactions >=========-------------------
  // | Methods for creating and sending transactions in different modes           |
  // ------------------------------------------------------------------------------

  // Deposit based on permittable token scheme. User should sign typed data to allow
  // contract receive his tokens
  // Returns jobId from the relayer or throw an Error
  public async depositPermittableV2(
    tokenAddress: string,
    amountGwei: bigint,
    signTypedData: (deadline: bigint, value: bigint, salt: string) => Promise<string>,
    fromAddress: string | null = null,
    feeGwei: bigint = BigInt(0),
  ): Promise<string> {
    const token = this.tokens[tokenAddress];
    const state = this.zpStates[tokenAddress];

    if (amountGwei < MIN_TX_AMOUNT) {
      throw new TxSmallAmount(amountGwei, MIN_TX_AMOUNT);
    }

    const limits = await this.getLimits(tokenAddress, (fromAddress !== null) ? fromAddress : undefined);
    if (amountGwei > limits.deposit.total) {
      throw new TxLimitError(amountGwei, limits.deposit.total);
    }

    await this.updateState(tokenAddress);

    let txData;
    if (fromAddress) {
      let deadline = Math.floor(Date.now() / 1000) + PERMIT_DEADLINE_INTERVAL;
      const holder = ethAddrToBuf(fromAddress);
      txData = await state.account.createDepositPermittable({ 
        amount: (amountGwei + feeGwei).toString(),
        fee: feeGwei.toString(),
        deadline: String(deadline),
        holder
      });

      // permittable deposit signature should be calculated for the typed data
      const value = (amountGwei + feeGwei) * state.denominator;
      const salt = '0x' + toTwosComplementHex(BigInt(txData.public.nullifier), 32);
      let signature = truncateHexPrefix(await signTypedData(BigInt(deadline), value, salt));
      if (this.config.network.isSignatureCompact()) {
        signature = toCompactSignature(signature);
      }

      // We should check deadline here because the user could introduce great delay
      if (Math.floor(Date.now() / 1000) > deadline - PERMIT_DEADLINE_THRESHOLD) {
        throw new TxDepositDeadlineExpiredError(deadline);
      }

      const startProofDate = Date.now();
      const txProof = await this.worker.proveTx(txData.public, txData.secret);
      const proofTime = (Date.now() - startProofDate) / 1000;
      console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

      const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
      if (!txValid) {
        throw new TxProofError();
      }

      let tx = { txType: TxType.BridgeDeposit, memo: txData.memo, proof: txProof, depositSignature: signature };
      const jobId = await this.sendTransactions(token.relayerUrl, [tx]);

      // Temporary save transaction in the history module (to prevent history delays)
      const ts = Math.floor(Date.now() / 1000);
      let rec = HistoryRecord.deposit(fromAddress, amountGwei, feeGwei, ts, "0", true);
      state.history.keepQueuedTransactions([rec], jobId);

      return jobId;

    } else {
      throw new TxInvalidArgumentError('You must provide fromAddress for deposit transaction');
    }
  }

  // Transfer shielded funds to the shielded address
  // This method can produce several transactions in case of insufficient input notes (constants::IN per tx)
  // // Returns jobId from the relayer or throw an Error
  public async transferMulti(tokenAddress: string, to: string, amountGwei: bigint, feeGwei: bigint = BigInt(0)): Promise<string[]> {
    const state = this.zpStates[tokenAddress];
    const token = this.tokens[tokenAddress];

    if (!validateAddress(to)) {
      throw new TxInvalidArgumentError('Invalid address. Expected a shielded address.');
    }

    if (amountGwei < MIN_TX_AMOUNT) {
      throw new TxSmallAmount(amountGwei, MIN_TX_AMOUNT);
    }

    const txParts = await this.getTransactionParts(tokenAddress, amountGwei, feeGwei);
    if (txParts.length == 0) {
      const available = await this.calcMaxAvailableTransfer(tokenAddress, false);
      const feeEst = await this.feeEstimate(tokenAddress, amountGwei, TxType.Transfer, false);
      throw new TxInsufficientFundsError(amountGwei + feeEst.total, available);
    }

    var jobsIds: string[] = [];
    var optimisticState: StateUpdate = {
      newLeafs: [],
      newCommitments: [],
      newAccounts: [],
      newNotes: [],
    }
    for (let index = 0; index < txParts.length; index++) {
      const onePart = txParts[index];
      const oneTx: ITransferData = {
        outputs: [{to, amount: onePart.amount.toString()}],
        fee: onePart.fee.toString(),
      };
      const oneTxData = await state.account.createTransferOptimistic(oneTx, optimisticState);

      console.log(`Transaction created: delta_index = ${oneTxData.parsed_delta.index}, root = ${oneTxData.public.root}`);

      const startProofDate = Date.now();
      const txProof: Proof = await this.worker.proveTx(oneTxData.public, oneTxData.secret);
      const proofTime = (Date.now() - startProofDate) / 1000;
      console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

      const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
      if (!txValid) {
        throw new TxProofError();
      }

      const transaction = {memo: oneTxData.memo, proof: txProof, txType: TxType.Transfer};

      const jobId = await this.sendTransactions(token.relayerUrl, [transaction]);
      jobsIds.push(jobId);

      // Temporary save transaction part in the history module (to prevent history delays)
      const ts = Math.floor(Date.now() / 1000);
      var record = HistoryRecord.transferOut([{to, amount: onePart.amount}], onePart.fee, ts, `${index}`, true);
      /*if (state.isOwnAddress(to)) {
        record = HistoryRecord.transferLoopback(to, onePart.amount, onePart.fee, ts, `${index}`, true);
      } else {
        record = HistoryRecord.transferOut([{to, amount: onePart.amount}], onePart.fee, ts, `${index}`, true);
      }*/
      state.history.keepQueuedTransactions([record], jobId);

      if (index < (txParts.length - 1)) {
        console.log(`Waiting while job ${jobId} queued by relayer`);
        // if there are few additional tx, we should collect the optimistic state before processing them
        await this.waitJobQueued(tokenAddress, jobId);

        optimisticState = await this.getNewState(tokenAddress);
      }
    }

    return jobsIds;
  }

  // Withdraw shielded funds to the specified native chain address
  // This method can produce several transactions in case of insufficient input notes (constants::IN per tx)
  // feeGwei - fee per single transaction (request it with atomicTxFee method)
  // Returns jobId from the relayer or throw an Error
  public async withdrawMulti(tokenAddress: string, address: string, amountGwei: bigint, feeGwei: bigint = BigInt(0)): Promise<string[]> {
    const token = this.tokens[tokenAddress];
    const state = this.zpStates[tokenAddress];

    if (amountGwei < MIN_TX_AMOUNT) {
      throw new TxSmallAmount(amountGwei, MIN_TX_AMOUNT);
    }

    const limits = await this.getLimits(tokenAddress, address);
    if (amountGwei > limits.withdraw.total) {
      throw new TxLimitError(amountGwei, limits.withdraw.total);
    }

    const txParts = await this.getTransactionParts(tokenAddress, amountGwei, feeGwei);
    if (txParts.length == 0) {
      const available = await this.calcMaxAvailableTransfer(tokenAddress, false);
      const feeEst = await this.feeEstimate(tokenAddress, amountGwei, TxType.Withdraw, false);
      throw new TxInsufficientFundsError(amountGwei + feeEst.total, available);
    }

    const addressBin = ethAddrToBuf(address);

    var jobsIds: string[] = [];
    var optimisticState: StateUpdate = {
      newLeafs: [],
      newCommitments: [],
      newAccounts: [],
      newNotes: [],
    }
    for (let index = 0; index < txParts.length; index++) {
      const onePart = txParts[index];
      const oneTx: IWithdrawData = {
        amount: onePart.amount.toString(),
        fee: onePart.fee.toString(),
        to: addressBin,
        native_amount: '0',
        energy_amount: '0',
      };
      const oneTxData = await state.account.createWithdrawalOptimistic(oneTx, optimisticState);

      const startProofDate = Date.now();
      const txProof: Proof = await this.worker.proveTx(oneTxData.public, oneTxData.secret);
      const proofTime = (Date.now() - startProofDate) / 1000;
      console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

      const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
      if (!txValid) {
        throw new TxProofError();
      }

      const transaction = {memo: oneTxData.memo, proof: txProof, txType: TxType.Withdraw};

      const jobId = await this.sendTransactions(token.relayerUrl, [transaction]);
      jobsIds.push(jobId);

      // Temporary save transaction part in the history module (to prevent history delays)
      const ts = Math.floor(Date.now() / 1000);
      var record = HistoryRecord.withdraw(address, onePart.amount, onePart.fee, ts, `${index}`, true);
      state.history.keepQueuedTransactions([record], jobId);

      if (index < (txParts.length - 1)) {
        console.log(`Waiting while job ${jobId} queued by relayer`);
        // if there are few additional tx, we should collect the optimistic state before processing them
        await this.waitJobQueued(tokenAddress, jobId);

        optimisticState = await this.getNewState(tokenAddress);
      }
    }

    return jobsIds;
  }

  // DEPRECATED. Please use depositPermittableV2 method instead
  // Deposit throught approval allowance
  // User should approve allowance for contract address at least 
  // (amountGwei + feeGwei) tokens before calling this method
  // Returns jobId
  public async deposit(
    tokenAddress: string,
    amountGwei: bigint,
    sign: (data: string) => Promise<string>,
    fromAddress: string | null = null,  // this field is only for substrate-based network,
                                        // it should be null for EVM
    feeGwei: bigint = BigInt(0),
  ): Promise<string> {
    const token = this.tokens[tokenAddress];
    const state = this.zpStates[tokenAddress];

    if (amountGwei < MIN_TX_AMOUNT) {
      throw new TxSmallAmount(amountGwei, MIN_TX_AMOUNT);
    }

    await this.updateState(tokenAddress);

    let txData = await state.account.createDeposit({
      amount: (amountGwei + feeGwei).toString(),
      fee: feeGwei.toString(),
    });

    const startProofDate = Date.now();
    const txProof = await this.worker.proveTx(txData.public, txData.secret);
    const proofTime = (Date.now() - startProofDate) / 1000;
    console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

    const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
    if (!txValid) {
      throw new TxProofError();
    }

    // regular deposit through approve allowance: sign transaction nullifier
    let dataToSign = '0x' + BigInt(txData.public.nullifier).toString(16).padStart(64, '0');

    // TODO: Sign fromAddress as well?
    const signature = truncateHexPrefix(await sign(dataToSign));
    
    // now we can restore actual depositer address and check it for limits
    const addrFromSig = addressFromSignature(signature, dataToSign);
    const limits = await this.getLimits(tokenAddress, addrFromSig);
    if (amountGwei > limits.deposit.total) {
      throw new TxLimitError(amountGwei, limits.deposit.total);
    }

    let fullSignature = signature;
    if (fromAddress) {
      const addr = truncateHexPrefix(fromAddress);
      fullSignature = addr + signature;
    }

    if (this.config.network.isSignatureCompact()) {
      fullSignature = toCompactSignature(fullSignature);
    }

    let tx = { txType: TxType.Deposit, memo: txData.memo, proof: txProof, depositSignature: fullSignature };
    const jobId = await this.sendTransactions(token.relayerUrl, [tx]);

    if (fromAddress) {
      // Temporary save transaction in the history module (to prevent history delays)
      const ts = Math.floor(Date.now() / 1000);
      let rec = HistoryRecord.deposit(fromAddress, amountGwei, feeGwei, ts, "0", true);
      state.history.keepQueuedTransactions([rec], jobId);
    }

    return jobId;
  }

  // DEPRECATED. Please use transferMulti method instead
  // Simple transfer to the shielded address. Supports several output addresses
  // This method will fail when insufficent input notes (constants::IN) for transfer
  public async transferSingle(tokenAddress: string, outsGwei: Output[], feeGwei: bigint = BigInt(0)): Promise<string> {
    await this.updateState(tokenAddress);

    const token = this.tokens[tokenAddress];
    const state = this.zpStates[tokenAddress];

    const outGwei = outsGwei.map(({ to, amount }) => {
      if (!validateAddress(to)) {
        throw new TxInvalidArgumentError('Invalid address. Expected a shielded address.');
      }

      if (BigInt(amount) < MIN_TX_AMOUNT) {
        throw new TxSmallAmount(amount, MIN_TX_AMOUNT);
      }

      return { to, amount };
    });

    const txData = await state.account.createTransfer({ outputs: outGwei, fee: feeGwei.toString() });

    const startProofDate = Date.now();
    const txProof = await this.worker.proveTx(txData.public, txData.secret);
    const proofTime = (Date.now() - startProofDate) / 1000;
    console.log(`Proof calculation took ${proofTime.toFixed(1)} sec`);

    const txValid = Proof.verify(this.snarkParams.transferVk!, txProof.inputs, txProof.proof);
    if (!txValid) {
      throw new TxProofError();
    }

    let tx = { txType: TxType.Transfer, memo: txData.memo, proof: txProof };
    const jobId = await this.sendTransactions(token.relayerUrl, [tx]);

    // Temporary save transactions in the history module (to prevent history delays)
    const feePerOut = feeGwei / BigInt(outGwei.length);
    let recs = outGwei.map(({to, amount}) => {
      const ts = Math.floor(Date.now() / 1000);
      return HistoryRecord.transferOut([{to, amount: BigInt(amount)}], feePerOut, ts, `0`, true);
      /*if (state.isOwnAddress(to)) {
        return HistoryRecord.transferLoopback(to, BigInt(amount), feePerOut, ts, "0", true);
      } else {
        return HistoryRecord.transferOut([{to, amount: BigInt(amount)}], feePerOut, ts, `0`, true);
        //return HistoryRecord.transferOut(to, BigInt(amount), feePerOut, ts, "0", true);
      }*/

    });
    state.history.keepQueuedTransactions(recs, jobId);

    return jobId;
  }

  // ------------------=========< Transaction configuration >=========-------------------
  // | These methods includes fee estimation, multitransfer estimation and other inform |
  // | functions.                                                                       |
  // ------------------------------------------------------------------------------------

  // Min trensaction fee in Gwei (e.g. deposit or single transfer)
  // To estimate fee in the common case please use feeEstimate instead
  public async atomicTxFee(tokenAddress: string): Promise<bigint> {
    const relayer = await this.getRelayerFee(tokenAddress);
    const l1 = BigInt(0);

    return relayer + l1;
  }

  // Fee can depends on tx amount for multitransfer transactions,
  // that's why you should specify it here for general case
  // This method also supposed that in some cases fee can depends on tx amount in future
  // Currently any deposit isn't depends of amount (txCnt is always 1)
  // There are two extra states in case of insufficient funds for requested token amount:
  //  1. txCnt contains number of transactions for maximum available transfer
  //  2. txCnt can't be less than 1 (e.g. when balance is less than atomic fee)
  public async feeEstimate(tokenAddress: string, amountGwei: bigint, txType: TxType, updateState: boolean = true): Promise<FeeAmount> {
    const relayer = await this.getRelayerFee(tokenAddress);
    const l1 = BigInt(0);
    let txCnt = 1;
    let totalPerTx = relayer + l1;
    let total = totalPerTx;
    let insufficientFunds = false;

    if (txType === TxType.Transfer || txType === TxType.Withdraw) {
      // we set allowPartial flag here to get parts anywhere
      const parts = await this.getTransactionParts(tokenAddress, amountGwei, totalPerTx, updateState, true);
      const totalBalance = await this.getTotalBalance(tokenAddress, false);

      let partsSumm = BigInt(0);
      for(let i = 0; i < parts.length; i++) {
        partsSumm += parts[i].amount;
      }

      txCnt = parts.length > 0 ? parts.length : 1;  // if we haven't funds for atomic fee - suppose we can make one tx
      total = totalPerTx * BigInt(txCnt);

      insufficientFunds = (partsSumm < amountGwei || partsSumm + total > totalBalance) ? true : false;
    } else {
      // Deposit and BridgeDeposit cases are independent on the user balance
      // Fee got from the native coins, so any deposit can be make within single tx
    }

    return {total, totalPerTx, txCnt, relayer, l1, insufficientFunds};
  }

  // Relayer fee component. Do not use it directly
  private async getRelayerFee(tokenAddress: string): Promise<bigint> {
    if (this.relayerFee === undefined) {
      // fetch actual fee from the relayer
      const token = this.tokens[tokenAddress];
      this.relayerFee = await this.fee(token.relayerUrl);
    }

    return this.relayerFee;
  }

  public async minTxAmount(): Promise<bigint> {
    return MIN_TX_AMOUNT;
  }

  // Account + notes balance excluding fee needed to transfer or withdraw it
  // TODO: need to optimize for edge cases (account limit calculating)
  public async calcMaxAvailableTransfer(tokenAddress: string, updateState: boolean = true): Promise<bigint> {
    const state = this.zpStates[tokenAddress];
    if (updateState) {
      await this.updateState(tokenAddress);
    }


    const txFee = await this.atomicTxFee(tokenAddress);
    const accountBalance = BigInt(state.accountBalance());
    const notesParts = this.getGroupedNotes(tokenAddress);

    let summ = BigInt(0);
    let oneTxPart = accountBalance;
    let i = 0;
    do {
      if (i < notesParts.length) {
        oneTxPart += notesParts[i];
      }

      if(oneTxPart < txFee) {
        break;
      }

      summ += (oneTxPart - txFee);

      oneTxPart = BigInt(0);
      i++;
    } while(i < notesParts.length);


    return summ;
  }

  // Calculate multitransfer configuration for specified token amount and fee per transaction
  // Applicable for transfer and withdrawal transactions. You can prevent state updating with updateState flag
  // Use allowPartial flag to return tx parts in case of insufficient funds for requested tx amount
  // (otherwise the void array will be returned in case of insufficient funds)
  // This method ALLOWS creating transaction parts less than MIN_TX_AMOUNT (check it before tx creating)
  public async getTransactionParts(tokenAddress: string, amountGwei: bigint, feeGwei: bigint, updateState: boolean = true, allowPartial: boolean = false): Promise<Array<TxAmount>> {
    const state = this.zpStates[tokenAddress];
    if (updateState) {
      await this.updateState(tokenAddress);
    }

    let result: Array<TxAmount> = [];
    const accountBalance = BigInt(state.accountBalance());
    let notesParts = this.getGroupedNotes(tokenAddress);

    let remainAmount = amountGwei;
    let oneTxPart = accountBalance;
    let i = 0;
    do {
      if (i < notesParts.length) {
        oneTxPart += notesParts[i];
      }

      if (oneTxPart - feeGwei > remainAmount) {
        oneTxPart = remainAmount + feeGwei;
      }

      if(oneTxPart < feeGwei) {
        break;
      }

      result.push({amount: oneTxPart - feeGwei, fee: feeGwei, accountLimit: BigInt(0)});

      remainAmount -= (oneTxPart - feeGwei);
      oneTxPart = BigInt(0);
      i++;
    } while(i < notesParts.length && remainAmount > 0);

    if (remainAmount > 0 && allowPartial == false) {
      result = [];
    }
    
    return result;
  }

  // calculate summ of notes grouped by CONSTANTS::IN
  private getGroupedNotes(tokenAddress: string): Array<bigint> {
    const state = this.zpStates[tokenAddress];
    const usableNotes = state.usableNotes();

    let notesParts: Array<bigint> = [];
    let curPart = BigInt(0);
    for(let i = 0; i < usableNotes.length; i++) {
      const curNote = usableNotes[i][1];

      if (i > 0 && i % CONSTANTS.IN == 0) {
        notesParts.push(curPart);
        curPart = BigInt(0);
      }

      curPart += BigInt(curNote.b);

      if (i == usableNotes.length - 1) {
        notesParts.push(curPart);
      }
    }

    return notesParts;
  }

  // The deposit and withdraw amount is limited by few factors:
  // https://docs.zkbob.com/bob-protocol/deposit-and-withdrawal-limits
  // Global limits are fetched from the relayer (except personal deposit limit from the specified address)
  public async getLimits(tokenAddress: string, address: string | undefined = undefined, directRequest: boolean = false): Promise<PoolLimits> {
    const token = this.tokens[tokenAddress];

    async function fetchLimitsFromContract(network: NetworkBackend): Promise<LimitsFetch> {
      const poolLimits = await network.poolLimits(token.poolAddress, address);
      return {
        deposit: {
          singleOperation: BigInt(poolLimits.depositCap),
          daylyForAddress: {
            total: BigInt(poolLimits.dailyUserDepositCap),
            available: BigInt(poolLimits.dailyUserDepositCap) - BigInt(poolLimits.dailyUserDepositCapUsage),
          },
          daylyForAll: {
            total:      BigInt(poolLimits.dailyDepositCap),
            available:  BigInt(poolLimits.dailyDepositCap) - BigInt(poolLimits.dailyDepositCapUsage),
          },
          poolLimit: {
            total:      BigInt(poolLimits.tvlCap),
            available:  BigInt(poolLimits.tvlCap) - BigInt(poolLimits.tvl),
          },
        },
        withdraw: {
          daylyForAll: {
            total:      BigInt(poolLimits.dailyWithdrawalCap),
            available:  BigInt(poolLimits.dailyWithdrawalCap) - BigInt(poolLimits.dailyWithdrawalCapUsage),
          },
        },
        tier: poolLimits.tier === undefined ? 0 : Number(poolLimits.tier)
      };
    }

    function defaultLimits(): LimitsFetch {
      // hardcoded values
      return {
        deposit: {
          singleOperation: BigInt(10000000000000),  // 10k tokens
          daylyForAddress: {
            total: BigInt(10000000000000),  // 10k tokens
            available: BigInt(10000000000000),  // 10k tokens
          },
          daylyForAll: {
            total:      BigInt(100000000000000),  // 100k tokens
            available:  BigInt(100000000000000),  // 100k tokens
          },
          poolLimit: {
            total:      BigInt(1000000000000000), // 1kk tokens
            available:  BigInt(1000000000000000), // 1kk tokens
          },
        },
        withdraw: {
          daylyForAll: {
            total:      BigInt(100000000000000),  // 100k tokens
            available:  BigInt(100000000000000),  // 100k tokens
          },
        },
        tier: 0
      };
    }

    // Fetch limits in the requested order
    let currentLimits: LimitsFetch;
    if (directRequest) {
      try {
        currentLimits = await fetchLimitsFromContract(this.config.network);
      } catch (e) {
        console.error(`Cannot fetch limits from the contract (${e}). Try to get them from relayer`);
        try {
          currentLimits = await this.limits(token.relayerUrl, address)
        } catch (err) {
          console.error(`Cannot fetch limits from the relayer (${err}). Getting hardcoded values. Please note your transactions can be reverted with incorrect limits!`);
          currentLimits = defaultLimits();
        }
      }
    } else {
      try {
        currentLimits = await this.limits(token.relayerUrl, address)
      } catch (e) {
        console.error(`Cannot fetch deposit limits from the relayer (${e}). Try to get them from contract directly`);
        try {
          currentLimits = await fetchLimitsFromContract(this.config.network);
        } catch (err) {
          console.error(`Cannot fetch deposit limits from contract (${err}). Getting hardcoded values. Please note your transactions can be reverted with incorrect limits!`);
          currentLimits = defaultLimits();
        }
      }
    }

    // helper
    const bigIntMin = (...args: bigint[]) => args.reduce((m, e) => e < m ? e : m);

    // Calculate deposit limits
    const allDepositLimits = [
      currentLimits.deposit.singleOperation,
      currentLimits.deposit.daylyForAddress.available,
      currentLimits.deposit.daylyForAll.available,
      currentLimits.deposit.poolLimit.available,
    ];
    let totalDepositLimit = bigIntMin(...allDepositLimits);

    // Calculate withdraw limits
    const allWithdrawLimits = [ currentLimits.withdraw.daylyForAll.available ];
    let totalWithdrawLimit = bigIntMin(...allWithdrawLimits);

    return {
      deposit: {
        total: totalDepositLimit >= 0 ? totalDepositLimit : BigInt(0),
        components: currentLimits.deposit,
      },
      withdraw: {
        total: totalWithdrawLimit >= 0 ? totalWithdrawLimit : BigInt(0),
        components: currentLimits.withdraw,
      },
      tier: currentLimits.tier
    }
  }

  // ------------------=========< State Processing >=========-------------------
  // | Updating and monitoring state                                            |
  // ----------------------------------------------------------------------------

  // The library can't make any transfers when there are outcoming
  // transactions in the optimistic state
  public async isReadyToTransact(tokenAddress: string): Promise<boolean> {
    return await this.updateState(tokenAddress);
  }

  // Wait while state becomes ready to make new transactions
  public async waitReadyToTransact(tokenAddress: string): Promise<boolean> {

    const INTERVAL_MS = 1000;
    const MAX_ATTEMPTS = 300;
    let attepts = 0;
    while (true) {
      let ready = await this.updateState(tokenAddress);

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

  // Getting array of accounts and notes for the current account
  public async rawState(tokenAddress: string): Promise<any> {
    return await this.zpStates[tokenAddress].rawState();
  }
  

  // TODO: implement correct state cleaning
  public async cleanState(tokenAddress: string): Promise<void> {
    await this.zpStates[tokenAddress].clean();
  }

  // Request the latest state from the relayer
  // Returns isReadyToTransact flag
  public async updateState(tokenAddress: string): Promise<boolean> {
    if (this.updateStatePromise == undefined) {
      this.updateStatePromise = this.updateStateOptimisticWorker(tokenAddress).finally(() => {
        this.updateStatePromise = undefined;
      });
    } else {
      console.info(`The state currently updating, waiting for finish...`);
    }

    return this.updateStatePromise;
  }

  // ---===< TODO >===---
  // The optimistic state currently processed only in the client library
  // Wasm package holds only the mined transactions
  // Currently it's just a workaround
  private async updateStateOptimisticWorker(tokenAddress: string): Promise<boolean> {
    const OUTPLUSONE = CONSTANTS.OUT + 1;

    const zpState = this.zpStates[tokenAddress];
    const token = this.tokens[tokenAddress];
    const state = this.zpStates[tokenAddress];

    const startIndex = Number(zpState.account.nextTreeIndex());

    const stateInfo = await this.info(token.relayerUrl);
    const nextIndex = Number(stateInfo.deltaIndex);
    const optimisticIndex = Number(stateInfo.optimisticDeltaIndex);

    if (optimisticIndex > startIndex) {
      const startTime = Date.now();
      
      console.log(`⬇ Fetching transactions between ${startIndex} and ${optimisticIndex}...`);

      
      let batches: Promise<BatchResult>[] = [];

      let readyToTransact = true;

      for (let i = startIndex; i <= optimisticIndex; i = i + BATCH_SIZE * OUTPLUSONE) {
        let oneBatch = this.fetchTransactionsOptimistic(token.relayerUrl, BigInt(i), BATCH_SIZE).then( async txs => {
          console.log(`Getting ${txs.length} transactions from index ${i}`);

          let batchState = new Map<number, StateUpdate>();
          
          let txHashes: Record<number, string> = {};
          let indexedTxs: IndexedTx[] = [];

          let txHashesPending: Record<number, string> = {};
          let indexedTxsPending: IndexedTx[] = [];

          let maxMinedIndex = -1;
          let maxPendingIndex = -1;

          for (let txIdx = 0; txIdx < txs.length; ++txIdx) {
            const tx = txs[txIdx];
            // Get the first leaf index in the tree
            const memo_idx = i + txIdx * OUTPLUSONE;
            
            // tx structure from relayer: mined flag + txHash(32 bytes, 64 chars) + commitment(32 bytes, 64 chars) + memo
            // 1. Extract memo block
            const memo = tx.slice(129); // Skip mined flag, txHash and commitment

            // 2. Get transaction commitment
            const commitment = tx.substr(65, 64)
            
            const indexedTx: IndexedTx = {
              index: memo_idx,
              memo: memo,
              commitment: commitment,
            }

            // 3. Get txHash
            const txHash = tx.substr(1, 64);

            // 4. Get mined flag
            if (tx.substr(0, 1) === '1') {
              indexedTxs.push(indexedTx);
              txHashes[memo_idx] = '0x' + txHash;
              maxMinedIndex = Math.max(maxMinedIndex, memo_idx);
            } else {
              indexedTxsPending.push(indexedTx);
              txHashesPending[memo_idx] = '0x' + txHash;
              maxPendingIndex = Math.max(maxPendingIndex, memo_idx);
            }
          }

          if (indexedTxs.length > 0) {
            const parseResult: ParseTxsResult = await this.worker.parseTxs(this.config.sk, indexedTxs);
            const decryptedMemos = parseResult.decryptedMemos;
            batchState.set(i, parseResult.stateUpdate);
            //state.account.updateState(parseResult.stateUpdate);
            this.logStateSync(i, i + txs.length * OUTPLUSONE, decryptedMemos);
            for (let decryptedMemoIndex = 0; decryptedMemoIndex < decryptedMemos.length; ++decryptedMemoIndex) {
              // save memos corresponding to the our account to restore history
              const myMemo = decryptedMemos[decryptedMemoIndex];
              myMemo.txHash = txHashes[myMemo.index];
              zpState.history.saveDecryptedMemo(myMemo, false);
            }
          }

          if (indexedTxsPending.length > 0) {
            const parseResult: ParseTxsResult = await this.worker.parseTxs(this.config.sk, indexedTxsPending);
            const decryptedPendingMemos = parseResult.decryptedMemos;
            for (let idx = 0; idx < decryptedPendingMemos.length; ++idx) {
              // save memos corresponding to the our account to restore history
              const myMemo = decryptedPendingMemos[idx];
              myMemo.txHash = txHashesPending[myMemo.index];
              zpState.history.saveDecryptedMemo(myMemo, true);

              if (myMemo.acc != undefined) {
                // There is a pending transaction initiated by ourselfs
                // So we cannot create new transactions in that case
                readyToTransact = false;
              }
            }
          }

          return {txCount: txs.length, maxMinedIndex, maxPendingIndex, state: batchState} ;
        });
        batches.push(oneBatch);
      };

      let totalState = new Map<number, StateUpdate>();
      let initRes: BatchResult = {txCount: 0, maxMinedIndex: -1, maxPendingIndex: -1, state: totalState};
      let totalRes = (await Promise.all(batches)).reduce((acc, cur) => {
        return {
          txCount: acc.txCount + cur.txCount,
          maxMinedIndex: Math.max(acc.maxMinedIndex, cur.maxMinedIndex),
          maxPendingIndex: Math.max(acc.maxPendingIndex, cur.maxPendingIndex),
          state: new Map([...Array.from(acc.state.entries()), ...Array.from(cur.state.entries())]),
        }
      }, initRes);

      let idxs = [...totalRes.state.keys()].sort((i1, i2) => i1 - i2);
      for (let idx of idxs) {
        let oneStateUpdate = totalRes.state.get(idx);
        if (oneStateUpdate !== undefined) {
          state.account.updateState(oneStateUpdate);
        } else {
          throw Error(`Cannot find state batch at index ${idx}`);
        }
      }

      // remove unneeded pending records
      zpState.history.setLastMinedTxIndex(totalRes.maxMinedIndex);
      zpState.history.setLastPendingTxIndex(totalRes.maxPendingIndex);


      const msElapsed = Date.now() - startTime;
      const avgSpeed = msElapsed / totalRes.txCount

      console.log(`Sync finished in ${msElapsed / 1000} sec | ${totalRes.txCount} tx, avg speed ${avgSpeed.toFixed(1)} ms/tx`);

      return readyToTransact;
    } else {
      zpState.history.setLastMinedTxIndex(nextIndex - OUTPLUSONE);
      zpState.history.setLastPendingTxIndex(-1);

      console.log(`Local state is up to date @${startIndex}`);

      return true;
    }
  }

  // Just fetch and process the new state without local state updating
  // Return StateUpdate object
  // This method used for multi-tx
  public async getNewState(tokenAddress: string): Promise<StateUpdate> {
    const OUTPLUSONE = CONSTANTS.OUT + 1;

    const zpState = this.zpStates[tokenAddress];
    const token = this.tokens[tokenAddress];

    const startIndex = zpState.account.nextTreeIndex();

    const stateInfo = await this.info(token.relayerUrl);
    const optimisticIndex = BigInt(stateInfo.optimisticDeltaIndex);

    if (optimisticIndex > startIndex) {
      const startTime = Date.now();
      
      console.log(`⬇ Fetching transactions between ${startIndex} and ${optimisticIndex}...`);

      const numOfTx = Number((optimisticIndex - startIndex) / BigInt(OUTPLUSONE));
      let stateUpdate = this.fetchTransactionsOptimistic(token.relayerUrl, startIndex, numOfTx).then( async txs => {
        console.log(`Getting ${txs.length} transactions from index ${startIndex}`);
        
        let indexedTxs: IndexedTx[] = [];

        for (let txIdx = 0; txIdx < txs.length; ++txIdx) {
          const tx = txs[txIdx];
          // Get the first leaf index in the tree
          const memo_idx = Number(startIndex) + txIdx * OUTPLUSONE;
          
          // tx structure from relayer: mined flag + txHash(32 bytes, 64 chars) + commitment(32 bytes, 64 chars) + memo
          // 1. Extract memo block
          const memo = tx.slice(129); // Skip mined flag, txHash and commitment

          // 2. Get transaction commitment
          const commitment = tx.substr(65, 64)
          
          const indexedTx: IndexedTx = {
            index: memo_idx,
            memo: memo,
            commitment: commitment,
          }

          // 3. add indexed tx
          indexedTxs.push(indexedTx);
        }

        const parseResult: ParseTxsResult = await this.worker.parseTxs(this.config.sk, indexedTxs);

        return parseResult.stateUpdate;
      });

      const msElapsed = Date.now() - startTime;
      const avgSpeed = msElapsed / numOfTx;

      console.log(`Fetch finished in ${msElapsed / 1000} sec | ${numOfTx} tx, avg speed ${avgSpeed.toFixed(1)} ms/tx`);

      return stateUpdate;
    } else {
      console.log(`Do not need to fetch @${startIndex}`);

      return {newLeafs: [], newCommitments: [], newAccounts: [], newNotes: []};
    }
  }

  public async logStateSync(startIndex: number, endIndex: number, decryptedMemos: DecryptedMemo[]) {
    const OUTPLUSONE = CONSTANTS.OUT + 1;
    for (let decryptedMemo of decryptedMemos) {
      if (decryptedMemo.index > startIndex) {
        console.info(`📝 Adding hashes to state (from index ${startIndex} to index ${decryptedMemo.index - OUTPLUSONE})`);
      }
      startIndex = decryptedMemo.index + OUTPLUSONE; 

      if (decryptedMemo.acc) {
        console.info(`📝 Adding account, notes, and hashes to state (at index ${decryptedMemo.index})`);
      } else {
        console.info(`📝 Adding notes and hashes to state (at index ${decryptedMemo.index})`);
      }
    }

    if (startIndex < endIndex) {
      console.info(`📝 Adding hashes to state (from index ${startIndex} to index ${endIndex - OUTPLUSONE})`);
    }
  }

  // ------------------=========< Relayer interactions >=========-------------------
  // | Methods to interact with the relayer                                        |
  // -------------------------------------------------------------------------------
  
  private async fetchTransactionsOptimistic(relayerUrl: string, offset: BigInt, limit: number = 100): Promise<string[]> {
    const url = new URL(`/transactions/v2`, relayerUrl);
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    const headers = {'content-type': 'application/json;charset=UTF-8'};

    const txs = await this.fetchJson(url.toString(), {headers});
    if (!Array.isArray(txs)) {
      throw new RelayerError(200, `Response should be an array`);
    }
  
    return txs;
  }
  
  // returns transaction job ID
  private async sendTransactions(relayerUrl: string, txs: TxToRelayer[]): Promise<string> {
    const url = new URL('/sendTransactions', relayerUrl);
    const headers = {'content-type': 'application/json;charset=UTF-8'};

    const res = await this.fetchJson(url.toString(), { method: 'POST', headers, body: JSON.stringify(txs) });
    if (typeof res.jobId !== 'string') {
      throw new RelayerError(200, `Cannot get jobId for transaction (response: ${res})`);
    }

    return res.jobId;
  }
  
  private async getJob(relayerUrl: string, id: string): Promise<JobInfo | null> {
    const url = new URL(`/job/${id}`, relayerUrl);
    const headers = {'content-type': 'application/json;charset=UTF-8'};
    const res = await this.fetchJson(url.toString(), {headers});
  
    if (isJobInfo(res)) {
      return res;
    }

    return null;
  }
  
  private async info(relayerUrl: string): Promise<RelayerInfo> {
    const url = new URL('/info', relayerUrl);
    const headers = {'content-type': 'application/json;charset=UTF-8'};
    const res = await this.fetchJson(url.toString(), {headers});

    if (isRelayerInfo(res)) {
      return res;
    }

    throw new RelayerError(200, `Incorrect response (expected RelayerInfo, got \'${res}\')`)
  }
  
  private async fee(relayerUrl: string): Promise<bigint> {
    try {
      const url = new URL('/fee', relayerUrl);
      const headers = {'content-type': 'application/json;charset=UTF-8'};
      const res = await this.fetchJson(url.toString(), {headers});
      return BigInt(res.fee);
    } catch {
      return DEFAULT_TX_FEE;
    }
  }
  
  private async limits(relayerUrl: string, address: string | undefined): Promise<LimitsFetch> {
    const url = new URL('/limits', relayerUrl);
    if (address !== undefined) {
      url.searchParams.set('address', address);
    }
    const headers = {'content-type': 'application/json;charset=UTF-8'};
    const res = await this.fetchJson(url.toString(), {headers});

    return {
      deposit: {
        singleOperation: BigInt(res.deposit.singleOperation),
        daylyForAddress: {
          total:     BigInt(res.deposit.daylyForAddress.total),
          available: BigInt(res.deposit.daylyForAddress.available),
        },
        daylyForAll: {
          total:      BigInt(res.deposit.daylyForAll.total),
          available:  BigInt(res.deposit.daylyForAll.available),
        },
        poolLimit: {
          total:      BigInt(res.deposit.poolLimit.total),
          available:  BigInt(res.deposit.poolLimit.available),
        },
      },
      withdraw: {
        daylyForAll: {
          total:      BigInt(res.withdraw.daylyForAll.total),
          available:  BigInt(res.withdraw.daylyForAll.available),
        },
      },
      tier: res.tier === undefined ? 0 : Number(res.tier)
    };
  }

  // Universal response parser
  private async fetchJson(url: string, headers: RequestInit): Promise<any> {
    let response: Response;
    try {
      response = await fetch(url, headers);
    } catch(err) {
      // server is unreachable
      throw new NetworkError(err);
    }

    // Extract response body: json | string | null
    let responseBody: any = null;
    const contentType = response.headers.get('content-type')!;
    if (contentType === null) responseBody = null;
    else if (contentType.startsWith('application/json;')) responseBody = await response.json();
    else if (contentType.startsWith('text/plain;')) responseBody = await response.text();
    else if (contentType.startsWith('text/html;')) responseBody = (await response.text()).replace(/<[^>]+>/g, '').replace(/(?:\r\n|\r|\n)/g, ' ').replace(/^\s+|\s+$/gm,'');
    else console.warn(`Unsupported response content-type in response: ${contentType}`);

    // Unsuccess error code case (not in range 200-299)
    if (!response.ok) {
      if (responseBody === null) {
        throw new RelayerError(response.status, 'no description provided');  
      }

      // process string error response
      if (typeof responseBody === 'string') {
        throw new RelayerError(response.status, responseBody);
      }

      // process 'errors' json response
      if (Array.isArray(responseBody.errors)) {
        let errorsText = responseBody.errors.map((oneError) => {
          return `[${oneError.path}]: ${oneError.message}`;
        }).join(', ');

        throw new RelayerError(response.status, errorsText);
      }

      // unknown error format
      throw new RelayerError(response.status, contentType);
    } 

    return responseBody;
  }
}
