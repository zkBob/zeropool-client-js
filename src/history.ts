import { openDB, IDBPDatabase } from 'idb';
import Web3 from 'web3';
import { Account, Note } from 'libzkbob-rs-wasm-web';
import { ShieldedTx, TxType } from './tx';
import { toCanonicalSignature } from './utils';
import { CONSTANTS } from './constants';
import { InternalError } from './errors';

export enum HistoryTransactionType {
	Deposit = 1,
	TransferIn,
  TransferOut,
	Withdrawal,
  // DEPRECATED. Please use TokensMoving.isLoopback property instead
  TransferLoopback,
}

export enum HistoryRecordState {
	Pending = 1,
	Mined,
  RejectedByRelayer,
  RejectedByPool,
}

export interface DecryptedMemo {
  index: number;
  acc: Account | undefined;
  inNotes:  { note: Note, index: number }[];
  outNotes: { note: Note, index: number }[];
  txHash: string | undefined;
}

export interface TokensMoving {
  from: string,
  to: string,
  amount: bigint,
  // This property is applicable only for outcoming transfers
  // true - destination address is belongs to the sender account
  isLoopback: boolean,
}


export class HistoryRecord {
  constructor(
    public type: HistoryTransactionType,
    public timestamp: number,
    public actions: TokensMoving[],
    public fee: bigint,
    public txHash: string,
    public state: HistoryRecordState,
    public failureReason?: string,
  ) {}

  public static async deposit(
    from: string,
    amount: bigint,
    fee: bigint,
    ts: number,
    txHash: string,
    pending: boolean
  ): Promise<HistoryRecord> {
    const action: TokensMoving = {from, to: "", amount, isLoopback: false};
    const state: HistoryRecordState = pending ? HistoryRecordState.Pending : HistoryRecordState.Mined;
    return new HistoryRecord(HistoryTransactionType.Deposit, ts, [action], fee, txHash, state);
  }

  public static async transferIn(
    transfers: {to: string, amount: bigint}[],
    fee: bigint,
    ts: number,
    txHash: string,
    pending: boolean
  ): Promise<HistoryRecord> {
    const actions: TokensMoving[] = transfers.map(({to, amount}) => { return ({from: "", to, amount, isLoopback: false}) });
    const state: HistoryRecordState = pending ? HistoryRecordState.Pending : HistoryRecordState.Mined;
    return new HistoryRecord(HistoryTransactionType.TransferIn, ts, actions, fee, txHash, state);
  }

  public static async transferOut(
    transfers: {to: string, amount: bigint}[],
    fee: bigint,
    ts: number,
    txHash: string,
    pending: boolean,
    getIsLoopback: (shieldedAddress: string) => Promise<boolean>
  ): Promise<HistoryRecord> {
    const actions: TokensMoving[] = await Promise.all(transfers.map(async ({to, amount}) => { 
      return ({from: "", to, amount, isLoopback: await getIsLoopback(to)})
    }));
    const state: HistoryRecordState = pending ? HistoryRecordState.Pending : HistoryRecordState.Mined;
    return new HistoryRecord(HistoryTransactionType.TransferOut, ts, actions, fee, txHash, state);
  }

  public static async withdraw(
    to: string,
    amount: bigint,
    fee: bigint,
    ts: number,
    txHash: string,
    pending: boolean
  ): Promise<HistoryRecord> {
    const action: TokensMoving = {from: "", to, amount, isLoopback: false};
    const state: HistoryRecordState = pending ? HistoryRecordState.Pending : HistoryRecordState.Mined;
    return new HistoryRecord(HistoryTransactionType.Withdrawal, ts, [action], fee, txHash, state);
  }

  // DEPRECATED method. Loopback is a TokenMoving property now
  public static transferLoopback(to: string, amount: bigint, fee: bigint, ts: number, txHash: string, pending: boolean): HistoryRecord {
    const action: TokensMoving = {from: "", to, amount, isLoopback: true};
    const state: HistoryRecordState = pending ? HistoryRecordState.Pending : HistoryRecordState.Mined;
    return new HistoryRecord(HistoryTransactionType.TransferLoopback, ts, [action], fee, txHash, state);
  }

  public toJson(): string {
    return JSON.stringify(this, (_, v) => typeof v === 'bigint' ? `${v}n` : v)
        .replace(/"(-?\d+)n"/g, (_, a) => a);
  }
}

export class HistoryRecordIdx {
  index: number;
  record: HistoryRecord;

  public static create(record: HistoryRecord, index: number): HistoryRecordIdx {
    let result = new HistoryRecordIdx();
    result.index = index;
    result.record = record;

    return result;
  }
}

export class TxHashIdx {
  index: number;
  txHash: string;

  public static create(txHash: string, index: number): TxHashIdx {
    let result = new TxHashIdx();
    result.index = index;
    result.txHash = txHash;

    return result;
  }
}


const TX_TABLE = 'TX_STORE';
const TX_FAILED_TABLE = 'TX_FAILED_STORE';
const DECRYPTED_MEMO_TABLE = 'DECRYPTED_MEMO';
const DECRYPTED_PENDING_MEMO_TABLE = 'DECRYPTED_PENDING_MEMO';
const HISTORY_STATE_TABLE = 'HISTORY_STATE';

// History storage holds the parsed history records corresponding to the current account
// and transaction hashes (on the native chain) which are needed for the history retrieving

export class HistoryStorage {
  private db: IDBPDatabase;
  private syncIndex = -1;
  private worker: any;

  private queuedTxs = new Map<string, HistoryRecord[]>(); // jobId -> HistoryRecord[]
                                          //(while tx isn't processed on relayer)
                                          // We don't know txHashes for history records at that moment,
                                          // but we can assign it sequence number inside a job.
                                          // So in HistoryRecords array txHash should be interpreted
                                          // as the index of transaction in correspondance of sending order

  private sendedTxs = new Map<string, HistoryRecord[]>(); // txHash -> HistoryRecord[]
                                          // (while we have a hash from relayer but it isn't indexed on RPC JSON)
                                          // At that moment we should fill txHash for every history record correctly

  private unparsedMemo = new Map<number, DecryptedMemo>();  // local decrypted memos cache
  private unparsedPendingMemo = new Map<number, DecryptedMemo>();  // local decrypted pending memos cache
  private currentHistory = new Map<number, HistoryRecord>();  // local history cache (index -> HistoryRecord)
  private failedHistory: HistoryRecord[] = [];  //  local failed history cache (unique_id -> HistoryRecord)
  private syncHistoryPromise: Promise<void> | undefined;
  private web3;

  constructor(db: IDBPDatabase, rpcUrl: string, worker: any) {
    this.db = db;
    this.web3 = new Web3(rpcUrl);
    this.worker = worker;
  }

  static async init(db_id: string, rpcUrl: string, worker: any): Promise<HistoryStorage> {
    const db = await openDB(`zeropool.${db_id}.history`, 3, {
      upgrade(db, oldVersion, newVersions) {
        if (oldVersion < 2) {
          db.createObjectStore(TX_TABLE);   // table holds parsed history transactions
          db.createObjectStore(DECRYPTED_MEMO_TABLE);  // holds memo blocks decrypted in the updateState process
          db.createObjectStore(DECRYPTED_PENDING_MEMO_TABLE);  // holds memo blocks decrypted in the updateState process, but not mined yet
          db.createObjectStore(HISTORY_STATE_TABLE);   
        }
        if (oldVersion < 3) {
          db.createObjectStore(TX_FAILED_TABLE, {autoIncrement: true});
        }
      }
    });

    const storage = new HistoryStorage(db, rpcUrl, worker);
    await storage.preloadCache();

    return storage;
  }

  public async preloadCache() {
    let syncIndex:number = await this.db.get(HISTORY_STATE_TABLE, 'sync_index');
    if (syncIndex ) {
      this.syncIndex = syncIndex;
    }

    // getting unprocessed memo array
    let allUnprocessedMemos: DecryptedMemo[] = await this.db.getAll(DECRYPTED_MEMO_TABLE, IDBKeyRange.lowerBound(this.syncIndex + 1));
    let allUnprocessedPendingMemos: DecryptedMemo[] = await this.db.getAll(DECRYPTED_PENDING_MEMO_TABLE, IDBKeyRange.lowerBound(this.syncIndex + 1));
    let lastMinedMemoIndex = -1;
    for (let oneMemo of allUnprocessedMemos) {
      this.unparsedMemo.set(oneMemo.index, oneMemo);
      if (oneMemo.index > lastMinedMemoIndex) {
        lastMinedMemoIndex = oneMemo.index; // get the max mined memo index
      }
    }
    for (let oneMemo of allUnprocessedPendingMemos) {
      if (oneMemo.index > lastMinedMemoIndex) { // skip outdated unparsed memos
        this.unparsedPendingMemo.set(oneMemo.index, oneMemo);
      }
    }

    // getting saved history records
    let cursor = await this.db.transaction(TX_TABLE).store.openCursor();
    while (cursor) {
      const curRecord = cursor.value;
      if (curRecord.actions === undefined) {
        console.log(`Old history record was found! Clean deprecated records...`);
        await this.db.clear(TX_TABLE);
        await this.db.clear(HISTORY_STATE_TABLE);
        this.syncIndex = -1;
        return this.preloadCache();
      }
      this.currentHistory.set(Number(cursor.primaryKey), cursor.value);
      cursor = await cursor.continue();
    }

    // getting failed history records
    this.failedHistory = await this.db.getAll(TX_FAILED_TABLE);

    console.log(`HistoryStorage: preload ${this.currentHistory.size} history records, ${this.unparsedMemo.size} + ${this.unparsedPendingMemo.size}(pending) unparsed memos(from index ${this.syncIndex + 1})`);
  }

  public async getAllHistory(getIsLoopback: (shieldedAddress: string) => Promise<boolean>): Promise<HistoryRecord[]> {
    if (this.syncHistoryPromise == undefined) {
      this.syncHistoryPromise = this.syncHistory(getIsLoopback).finally( () => {
        this.syncHistoryPromise = undefined;
      });
    }

    await this.syncHistoryPromise;

    let recordsArray = Array.from(this.currentHistory.values());
    return recordsArray
            .concat(this.failedHistory)
            .sort((rec1, rec2) => 0 - (rec1.timestamp > rec2.timestamp ? -1 : 1));
  }

  // remember just sended transactions to restore history record immediately
  public keepQueuedTransactions(txs: HistoryRecord[], jobId: string) {
    this.queuedTxs.set(jobId, txs);
  }

  // set txHash mapping for awaiting transactions
  public setTxHashesForQueuedTransactions(jobId: string, txHashes: string[]) {
    let txs = this.queuedTxs.get(jobId);
    if (txs && txHashes.length > 0) {
      for(let oneTx of txs) {
        let hashIndex = Number(oneTx.txHash);
        if (hashIndex >= 0 && hashIndex < txHashes.length) {
          oneTx.txHash = txHashes[hashIndex];
          let array = this.sendedTxs.get(oneTx.txHash);
          if(array === undefined) {
            array = [];
          }
          array.push(oneTx);
          this.sendedTxs.set(oneTx.txHash, array);
        }
      }      
    }

    this.queuedTxs.delete(jobId);
  }

  // mark pending transaction as failed on the relayer level
  public async setQueuedTransactionFailedByRelayer(jobId: string, error: string | undefined): Promise<boolean> {
    let txs = this.queuedTxs.get(jobId);
    if (txs) {
      for(let oneTx of txs) {
        oneTx.state = HistoryRecordState.RejectedByRelayer;
        oneTx.failureReason = error;

        this.failedHistory.push(oneTx);
        await this.db.put(TX_FAILED_TABLE, oneTx);
      }    

      this.queuedTxs.delete(jobId);

      return true;
    }

    return false;
  }

  // mark pending transaction as failed on the relayer level
  public async setSendedTransactionFailedByPool(txHash: string, error: string | undefined): Promise<boolean> {
    let txs = this.sendedTxs.get(txHash);
    if (txs) {
      for(let oneTx of txs) {
        oneTx.state = HistoryRecordState.RejectedByPool;
        oneTx.failureReason = error;

        this.failedHistory.push(oneTx);
        await this.db.put(TX_FAILED_TABLE, oneTx);
      }    

      this.sendedTxs.delete(txHash);

      return true;
    }

    return false;
  }

  public async saveDecryptedMemo(memo: DecryptedMemo, pending: boolean): Promise<DecryptedMemo> {
    const mask = (-1) << CONSTANTS.OUTLOG;
    const memoIndex = memo.index & mask;

    if (pending) {
      this.unparsedPendingMemo.set(memoIndex, memo);
      await this.db.put(DECRYPTED_PENDING_MEMO_TABLE, memo, memoIndex);
    } else {
      if (memo.index > this.syncIndex) {
        this.unparsedMemo.set(memoIndex, memo);
      }
      await this.db.put(DECRYPTED_MEMO_TABLE, memo, memoIndex);
    }

    return memo;
  }

  public async getDecryptedMemo(index: number, allowPending: boolean): Promise<DecryptedMemo | null> {
    const mask = (-1) << CONSTANTS.OUTLOG;
    const memoIndex = index & mask;

    let memo = await this.db.get(DECRYPTED_MEMO_TABLE, memoIndex);
    if (memo === null && allowPending) {
      memo = await this.db.get(DECRYPTED_PENDING_MEMO_TABLE, memoIndex);
    }
    return memo;
  }

  public async setLastMinedTxIndex(index: number): Promise<void> {
    for (const oneKey of this.unparsedPendingMemo.keys()) {
      if (oneKey <= index) {
        this.unparsedPendingMemo.delete(oneKey);
      }
    }

    await this.db.delete(DECRYPTED_PENDING_MEMO_TABLE, IDBKeyRange.upperBound(index));
  }

  public async setLastPendingTxIndex(index: number): Promise<void> {
    for (const oneKey of this.unparsedPendingMemo.keys()) {
      if (oneKey > index) {
        this.unparsedPendingMemo.delete(oneKey);
      }
    }

    await this.db.delete(DECRYPTED_PENDING_MEMO_TABLE, IDBKeyRange.lowerBound(index, true));
  }

  public async cleanHistory(): Promise<void> {
    if (this.syncHistoryPromise) {
      // wait while sync is finished (if started)
      await this.syncHistoryPromise;
    }

    // Remove all records from the database
    await this.db.clear(TX_TABLE);
    await this.db.clear(TX_FAILED_TABLE);
    await this.db.clear(DECRYPTED_MEMO_TABLE);
    await this.db.clear(DECRYPTED_PENDING_MEMO_TABLE);
    await this.db.clear(HISTORY_STATE_TABLE);

    // Clean local cache
    this.syncIndex = -1;
    this.unparsedMemo.clear();
    this.unparsedPendingMemo.clear();
    this.currentHistory.clear();
  }

  // ------- Private rouutines --------

  private async syncHistory(getIsLoopback: (shieldedAddress: string) => Promise<boolean>): Promise<void> {
    const startTime = Date.now();

    if (this.unparsedMemo.size > 0 || this.unparsedPendingMemo.size > 0) {
      console.log(`Starting memo synchronizing from the index ${this.syncIndex + 1} (${this.unparsedMemo.size} + ${this.unparsedPendingMemo.size}(pending)  unprocessed memos)`);

      let historyPromises: Promise<HistoryRecordIdx[]>[] = [];
      
      // process mined memos
      let processedIndexes: number[] = [];
      for (let oneMemo of this.unparsedMemo.values()) {
        let hist = this.convertToHistory(oneMemo, false, getIsLoopback);
        historyPromises.push(hist);

        processedIndexes.push(oneMemo.index);
      }

      // process pending memos
      let processedPendingIndexes: number[] = [];
      for (let oneMemo of this.unparsedPendingMemo.values()) {
        if (this.failedHistory.find(rec => rec.txHash == oneMemo.txHash) === undefined) {
          let hist = this.convertToHistory(oneMemo, true, getIsLoopback);
          historyPromises.push(hist);

          processedPendingIndexes.push(oneMemo.index);
        }
      }

      let historyRedords = await Promise.all(historyPromises);

      // delete all pending history records [we'll refresh them immediately]
      for (const [index, record] of this.currentHistory.entries()) {
        if (record.state == HistoryRecordState.Pending) {
          this.currentHistory.delete(index);
        }
      }

      let newSyncIndex = this.syncIndex;
      for (let oneSet of historyRedords) {
        for (let oneRec of oneSet) {
          console.log(`History record @${oneRec.index} has been created`);

          this.currentHistory.set(oneRec.index, oneRec.record);

          if (oneRec.record.state == HistoryRecordState.Mined) {
            // save history record only for mined transactions
            this.put(oneRec.index, oneRec.record);
            newSyncIndex = oneRec.index;
          }
        }
      }

      for (let oneIndex of processedIndexes) {
        this.unparsedMemo.delete(oneIndex);
      }

      await this.processSendedTxs();

      this.syncIndex = newSyncIndex;
      this.db.put(HISTORY_STATE_TABLE, this.syncIndex, 'sync_index');

      const timeMs = Date.now() - startTime;
      console.log(`History has been synced up to index ${this.syncIndex} in ${timeMs} msec`);
    } else {
      // No any records (new or pending)
      // delete all pending history records
      for (const [index, record] of this.currentHistory.entries()) {
        if (record.state == HistoryRecordState.Pending) {
          this.currentHistory.delete(index);
        }
      }

      await this.processSendedTxs();

      console.log(`Memo sync is not required: already up-to-date (on index ${this.syncIndex + 1})`);
    }
  }

  // scan sended tx to check if one reverted on the Pool contract
  private async processSendedTxs(): Promise<void> {
    for (let oneSendedTxHash of this.sendedTxs.keys()) {
      const txReceipt = await this.web3.eth.getTransactionReceipt(oneSendedTxHash);
      if (txReceipt && txReceipt.status !== undefined) {
        if (txReceipt.status == false) {
          const txData = await this.web3.eth.getTransaction(oneSendedTxHash);
          
          let reason = 'unknown reason';
          try {
            await this.web3.eth.call(txData, txData.blockNumber)
          } catch(err) {
            reason = err.message;
          }
          console.log(`Revert reason for ${oneSendedTxHash}: ${reason}`)

          let records = this.sendedTxs.get(oneSendedTxHash);
          if (records !== undefined) {
            for (let oneRecord of records) {
              oneRecord.state = HistoryRecordState.RejectedByPool;
              oneRecord.failureReason = reason;
              
              this.failedHistory.push(oneRecord);
              await this.db.put(TX_FAILED_TABLE, oneRecord);
            }
          }

          // remove tx from sended transactions - it's now in failedHistory
          this.sendedTxs.delete(oneSendedTxHash);
          
          // remove pending transactions with the same txHash
          for (const [index, record] of this.currentHistory) {
            if (record.state == HistoryRecordState.Pending && record.txHash == oneSendedTxHash) {
              this.currentHistory.delete(index);
            }
          }

        }
      }
    }
  }

  private async put(index: number, data: HistoryRecord): Promise<HistoryRecord> {
    await this.db.put(TX_TABLE, data, index);
    return data;
  }

  private async get(index: number): Promise<HistoryRecord | null> {
    let data = await this.db.get(TX_TABLE, index);
    return data;
  }

  private async convertToHistory(memo: DecryptedMemo, pending: boolean, getIsLoopback: (shieldedAddress: string) => Promise<boolean>): Promise<HistoryRecordIdx[]> {
    let txHash = memo.txHash;
    if (txHash) {
      const txData = await this.web3.eth.getTransaction(txHash);
      if (txData && txData.blockNumber && txData.input) {
          const block = await this.web3.eth.getBlock(txData.blockNumber);
          if (block) {
              let ts: number = 0;
              if (typeof block.timestamp === "number" ) {
                  ts = block.timestamp;
              } else if (typeof block.timestamp === "string" ) {
                  ts = Number(block.timestamp);
              }

              // Decode transaction data
              try {
                const tx = ShieldedTx.decode(txData.input);
                const feeAmount = BigInt('0x' + tx.memo.substr(0, 16))

                if (tx.selector.toLowerCase() == "af989083") {
                    // All data is collected here. Let's analyze it

                    let allRecords: HistoryRecordIdx[] = [];
                    if (tx.txType == TxType.Deposit) {
                      // here is a deposit transaction (approvable method)
                      // source address are recovered from the signature
                      if (tx.extra && tx.extra.length >= 128) {
                        const fullSig = toCanonicalSignature(tx.extra.substr(0, 128));
                        const nullifier = '0x' + tx.nullifier.toString(16).padStart(64, '0');
                        const depositHolderAddr = await this.web3.eth.accounts.recover(nullifier, fullSig);

                        let rec = await HistoryRecord.deposit(depositHolderAddr, tx.tokenAmount, feeAmount, ts, txHash, pending);
                        allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                        
                      } else {
                        //incorrect signature
                        throw new InternalError(`no signature for approvable deposit`);
                      }

                    } else if (tx.txType == TxType.BridgeDeposit) {
                      // here is a deposit transaction (permittable token)
                      // source address in the memo block (20 bytes, starts from 16 bytes offset)
                      const depositHolderAddr = '0x' + tx.memo.substr(32, 40);  // TODO: Check it!

                      let rec = await HistoryRecord.deposit(depositHolderAddr, tx.tokenAmount, feeAmount, ts, txHash, pending);
                      allRecords.push(HistoryRecordIdx.create(rec, memo.index));

                    } else if (tx.txType == TxType.Transfer) {
                      // there are 2 cases: 
                      if (memo.acc) {
                        // 1. we initiated it => outcoming tx(s)
                        const transfers = await Promise.all(memo.outNotes.map(async ({note, index}) => {
                          const destAddr = await this.worker.assembleAddress(note.d, note.p_d);
                          return {to: destAddr, amount: BigInt(note.b)};
                        }));;

                        const rec = await HistoryRecord.transferOut(transfers, feeAmount, ts, txHash, pending, getIsLoopback);
                        allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                      } else {
                        // 2. somebody initiated it => incoming tx(s)

                        const transfers = await Promise.all(memo.inNotes.map(async ({note, index}) => {
                          const destAddr = await this.worker.assembleAddress(note.d, note.p_d);
                          return {to: destAddr, amount: BigInt(note.b)};
                        }));

                        let rec = await HistoryRecord.transferIn(transfers, BigInt(0), ts, txHash, pending);
                        allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                      }
                    } else if (tx.txType == TxType.Withdraw) {
                      // withdrawal transaction (destination address in the memoblock)
                      const withdrawDestAddr = '0x' + tx.memo.substr(32, 40);

                      let rec = await HistoryRecord.withdraw(withdrawDestAddr, -(tx.tokenAmount + feeAmount), feeAmount, ts, txHash, pending);
                      allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                    }

                    // if we found txHash in the blockchain -> remove it from the saved tx array
                    if (pending) {
                      // if tx is in pending state - remove it only on success
                      const txReceipt = await this.web3.eth.getTransactionReceipt(txHash);
                      if (txReceipt && txReceipt.status !== undefined && txReceipt.status == true) {
                        this.sendedTxs.delete(txHash);                        
                      }
                    } else {
                      this.sendedTxs.delete(txHash);
                    }

                    return allRecords;

                } else {
                  throw new InternalError(`Cannot decode calldata for tx ${txHash}: incorrect selector ${tx.selector}`);
                }
              }
              catch (e) {
                throw new InternalError(`Cannot decode calldata for tx ${txHash}: ${e}`);
              }
          }

          throw new InternalError(`Unable to get timestamp for block ${txData.blockNumber}`);
      } else {
        // Look for a transactions, initiated by the user and try to convert it to the HistoryRecord
        let sendedRecords = this.sendedTxs.get(txHash);
        if (sendedRecords !== undefined) {
          console.log(`HistoryStorage: hash ${txHash} doesn't found, but it corresponds to the previously saved ${sendedRecords.length} transaction(s)`);
          return sendedRecords.map((oneRecord, index) => HistoryRecordIdx.create(oneRecord, memo.index + index));
        }
      }

      //throw new InternalError(`Unable to get transaction details (${txHash})`);
      // TODO: make it more precisely
      return [];

    }

    throw new InternalError(`Cannot find txHash for memo at index ${memo.index}`);
  }

}
