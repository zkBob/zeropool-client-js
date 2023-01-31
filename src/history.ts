import { openDB, IDBPDatabase } from 'idb';
import Web3 from 'web3';
import { Account, Note } from 'libzkbob-rs-wasm-web';
import { ShieldedTx, TxType } from './tx';
import { toCanonicalSignature } from './utils';
import { CONSTANTS } from './constants';
import { InternalError } from './errors';

const LOG_HISTORY_SYNC = false;

export enum HistoryTransactionType {
  Deposit = 1,
  TransferIn,
  TransferOut,
  Withdrawal,
  AggregateNotes,
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

  public static async aggregateNotes(
    fee: bigint,
    ts: number,
    txHash: string,
    pending: boolean
  ): Promise<HistoryRecord> {
    const state: HistoryRecordState = pending ? HistoryRecordState.Pending : HistoryRecordState.Mined;
    return new HistoryRecord(HistoryTransactionType.AggregateNotes, ts, [], fee, txHash, state);
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
    const result = new HistoryRecordIdx();
    result.index = index;
    result.record = record;

    return result;
  }
}

export class TxHashIdx {
  index: number;
  txHash: string;

  public static create(txHash: string, index: number): TxHashIdx {
    const result = new TxHashIdx();
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
                                          // We don't know txHash for history records at that moment
                                          // Please keep in mind that one job contain just one txHash,
                                          // but transaction in common case could consist of several HistoryRecords
                                          // (e.g. deposit + transfer, unimplemented case currently)

  private sentTxs = new Map<string, HistoryRecord[]>(); // txHash -> HistoryRecord[]
                                          // (while we have a hash from relayer but it isn't indexed on RPC JSON)
                                          // At that moment we should fill txHash for every history record correctly

  private unparsedMemo = new Map<number, DecryptedMemo>();  // local decrypted memos cache
  private unparsedPendingMemo = new Map<number, DecryptedMemo>();  // local decrypted pending memos cache
  
  private currentHistory = new Map<number, HistoryRecord>();  // local history cache (index -> HistoryRecord)
  private failedHistory: HistoryRecord[] = [];  //  local failed history cache (we have no key here, just array)


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
    const syncIndex:number = await this.db.get(HISTORY_STATE_TABLE, 'sync_index');
    if (syncIndex ) {
      this.syncIndex = syncIndex;
    }

    // getting unprocessed memo array
    const allUnprocessedMemos: DecryptedMemo[] = await this.db.getAll(DECRYPTED_MEMO_TABLE, IDBKeyRange.lowerBound(this.syncIndex + 1));
    const allUnprocessedPendingMemos: DecryptedMemo[] = await this.db.getAll(DECRYPTED_PENDING_MEMO_TABLE, IDBKeyRange.lowerBound(this.syncIndex + 1));
    let lastMinedMemoIndex = -1;
    for (const oneMemo of allUnprocessedMemos) {
      this.unparsedMemo.set(oneMemo.index, oneMemo);
      if (oneMemo.index > lastMinedMemoIndex) {
        lastMinedMemoIndex = oneMemo.index; // get the max mined memo index
      }
    }
    for (const oneMemo of allUnprocessedPendingMemos) {
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

    return Array.from(this.currentHistory.values())
            .concat(this.failedHistory)
            .sort((rec1, rec2) => 0 - (rec1.timestamp > rec2.timestamp ? -1 : 1));
  }

  // remember just sent transactions to restore history record immediately
  public keepQueuedTransactions(txs: HistoryRecord[], jobId: string) {
    this.queuedTxs.set(jobId, txs);
  }

  // A new txHash assigned for the jobId:
  // set txHash mapping for awaiting transactions
  public setTxHashForQueuedTransactions(jobId: string, txHash: string) {
    const records = this.queuedTxs.get(jobId);
    if (records !== undefined) {
      // Get history records associated with jobId
      // and assign new txHash for them
      const sentHistoryRecords: HistoryRecord[] = [];
      let oldTxHash = '';
      for(const aRec of records) {
        if (oldTxHash.length == 0 && aRec.txHash && aRec.txHash.startsWith('0x')){
          // note: all history records inside jobId should have the same txHash
          oldTxHash = aRec.txHash;
        }

        aRec.txHash = txHash; // sinse 'record' and 'aRec' are references
                              // txHash will changed in queuedTxs too
        sentHistoryRecords.push(aRec);
      }

      if (oldTxHash != txHash) {
        // Here is a case when txHash has been changed for existing job:
        // we should remove records from sentTxs with old txHash
        this.removePendingTxByTxHash(oldTxHash);
      }

      // set history records in the sentTx mapping
      this.sentTxs.set(txHash, sentHistoryRecords);
    }
  }

  // Mark job as completed: remove it from 'queuedTxs' and 'sentTxs' mappings
  public async setQueuedTransactionsCompleted(jobId: string, txHash: string) : Promise<boolean> {
    return this.removePendingTxByJob(jobId) || 
            this.removePendingTxByTxHash(txHash);

  }

  // mark pending transaction as failed on the relayer level (we shouldn't have txHash here)
  public async setQueuedTransactionFailedByRelayer(jobId: string, error: string | undefined): Promise<boolean> {
    const records = this.queuedTxs.get(jobId);
    if (records) {
      // moving all records from that job to the failedHistory table
      for(const aRec of records) {
        aRec.state = HistoryRecordState.RejectedByRelayer;
        aRec.failureReason = error;

        this.failedHistory.push(aRec);
        await this.db.put(TX_FAILED_TABLE, aRec);
      }    

      this.removePendingTxByJob(jobId);

      return true;
    }

    return false;
  }

  // mark pending transaction as failed on the relayer level
  public async setSentTransactionFailedByPool(jobId: string, txHash: string, error: string | undefined): Promise<boolean> {
    // try to locate txHash in sentTxs
    const txs = this.sentTxs.get(txHash);
    if (txs) {
      for(const oneTx of txs) {
        oneTx.state = HistoryRecordState.RejectedByPool;
        oneTx.failureReason = error;

        this.failedHistory.push(oneTx);
        await this.db.put(TX_FAILED_TABLE, oneTx);
      }    

      this.removePendingTxByJob(jobId);
      this.removePendingTxByTxHash(txHash);
      this.removeHistoryPendingRecordsByTxHash(txHash);

      return true;
    }

    // txHash of that transaction can be changed
    // => locate it in queuedTxs map by jobId
    const records = this.queuedTxs.get(jobId);
    if (records) {
      // moving all records from that job to the failedHistory table
      let oldTxHash = '';
      for(const aRec of records) {
        if (oldTxHash.length == 0 && aRec.txHash.startsWith('0x')) {
          oldTxHash = aRec.txHash;
        }
        aRec.state = HistoryRecordState.RejectedByPool;
        aRec.failureReason = error;
        aRec.txHash = txHash;

        this.failedHistory.push(aRec);
        await this.db.put(TX_FAILED_TABLE, aRec);
      }    

      this.removePendingTxByJob(jobId);
      if (oldTxHash.startsWith('0x')) {
        this.removeHistoryPendingRecordsByTxHash(oldTxHash);
      }

      return true;
    }

    return false;
  }

  private removePendingTxByJob(jobId: string): boolean {
    const records = this.queuedTxs.get(jobId);
    if (records) {
      this.queuedTxs.delete(jobId);

      // remove associated records from the sentTxs
      for(const aRec of records) {
        if (aRec.txHash.startsWith('0x')) {
          this.sentTxs.delete(aRec.txHash);
        }
      }

      return true;
    }

    return false;
  }

  private removePendingTxByTxHash(txHash: string): boolean {
    // remove records from the sentTxs by txHash
   let res = this.sentTxs.delete(txHash);

    // remove queued txs with the same txHash
    this.queuedTxs.forEach((records, jobId) => {
      for (const aRec of records) {
        if (aRec.txHash == txHash) {
          this.queuedTxs.delete(jobId);
          res = true;
        }
      }
    });

    return res;
  }

  // remove pending transactions with the txHash
  private removeHistoryPendingRecordsByTxHash(txHash: string): boolean {
    let deleted = false;
    for (const [index, record] of this.currentHistory) {
      if (record.state == HistoryRecordState.Pending && record.txHash == txHash) {
        deleted ||= this.currentHistory.delete(index);
      }
    }

    return deleted;
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

  public async rollbackHistory(rollbackIndex: number): Promise<void> {
    if (this.syncHistoryPromise) {
      // wait while sync is finished (if started)
      await this.syncHistoryPromise;
    }

    // rollback local objects
    this.currentHistory.forEach((_value: HistoryRecord, key: number) => {
      if (key >= rollbackIndex) {
        this.currentHistory.delete(key);
      }
    });
    let new_sync_index = -1;
    this.unparsedMemo.forEach((_value: DecryptedMemo, key: number) => {
      if (key >= rollbackIndex) {
        this.unparsedMemo.delete(key);
      } else if (key > new_sync_index) {
        new_sync_index = key;
      }
    });
    this.unparsedPendingMemo.forEach((_value: DecryptedMemo, key: number) => {
      if (key >= rollbackIndex) {
        this.unparsedPendingMemo.delete(key);
      }
    });


    // Remove records after the specified idex from the database
    await this.db.delete(TX_TABLE, IDBKeyRange.lowerBound(rollbackIndex));
    await this.db.delete(DECRYPTED_MEMO_TABLE, IDBKeyRange.lowerBound(rollbackIndex));
    await this.db.delete(DECRYPTED_PENDING_MEMO_TABLE, IDBKeyRange.lowerBound(rollbackIndex));

    // update sync_index
    this.syncIndex = new_sync_index
    if (this.syncIndex < 0) {
      this.db.delete(HISTORY_STATE_TABLE, 'sync_index');
    } else {
      this.db.put(HISTORY_STATE_TABLE, this.syncIndex, 'sync_index');
    }
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
    this.failedHistory = [];
  }

  // ------- Private rouutines --------

  private async syncHistory(getIsLoopback: (shieldedAddress: string) => Promise<boolean>): Promise<void> {
    const startTime = Date.now();

    if (this.unparsedMemo.size > 0 || this.unparsedPendingMemo.size > 0) {
      console.log(`Starting memo synchronizing from the index ${this.syncIndex + 1} (${this.unparsedMemo.size} + ${this.unparsedPendingMemo.size}(pending)  unprocessed memos)`);

      const historyPromises: Promise<HistoryRecordIdx[]>[] = [];
      
      // process mined memos
      const processedIndexes: number[] = [];
      for (const oneMemo of this.unparsedMemo.values()) {
        const hist = this.convertToHistory(oneMemo, false, getIsLoopback);
        historyPromises.push(hist);

        processedIndexes.push(oneMemo.index);
      }

      // process pending memos
      const processedPendingIndexes: number[] = [];
      for (const oneMemo of this.unparsedPendingMemo.values()) {
        if (this.failedHistory.find(rec => rec.txHash == oneMemo.txHash) === undefined) {
          const hist = this.convertToHistory(oneMemo, true, getIsLoopback);
          historyPromises.push(hist);

          processedPendingIndexes.push(oneMemo.index);
        }
      }

      const historyRedords = await Promise.all(historyPromises);

      // delete all pending history records [we'll refresh them immediately]
      for (const [index, record] of this.currentHistory.entries()) {
        if (record.state == HistoryRecordState.Pending) {
          this.currentHistory.delete(index);
        }
      }

      let newSyncIndex = this.syncIndex;
      for (const oneSet of historyRedords) {
        for (const oneRec of oneSet) {
          if (LOG_HISTORY_SYNC) {
            console.log(`History record @${oneRec.index} has been created`);
          }

          this.currentHistory.set(oneRec.index, oneRec.record);

          if (oneRec.record.state == HistoryRecordState.Mined) {
            // save history record only for mined transactions
            this.put(oneRec.index, oneRec.record);
            newSyncIndex = oneRec.index;
          }
        }
      }

      for (const oneIndex of processedIndexes) {
        this.unparsedMemo.delete(oneIndex);
      }

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

      console.log(`Memo sync is not required: already up-to-date (on index ${this.syncIndex + 1})`);
    }
  }

  private async put(index: number, data: HistoryRecord): Promise<HistoryRecord> {
    await this.db.put(TX_TABLE, data, index);
    return data;
  }

  private async get(index: number): Promise<HistoryRecord | null> {
    const data = await this.db.get(TX_TABLE, index);
    return data;
  }

  private async convertToHistory(memo: DecryptedMemo, pending: boolean, getIsLoopback: (shieldedAddress: string) => Promise<boolean>): Promise<HistoryRecordIdx[]> {
    const txHash = memo.txHash;
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

                    const allRecords: HistoryRecordIdx[] = [];
                    if (tx.txType == TxType.Deposit) {
                      // here is a deposit transaction (approvable method)
                      // source address are recovered from the signature
                      if (tx.extra && tx.extra.length >= 128) {
                        const fullSig = toCanonicalSignature(tx.extra.substr(0, 128));
                        const nullifier = '0x' + tx.nullifier.toString(16).padStart(64, '0');
                        const depositHolderAddr = await this.web3.eth.accounts.recover(nullifier, fullSig);

                        const rec = await HistoryRecord.deposit(depositHolderAddr, tx.tokenAmount, feeAmount, ts, txHash, pending);
                        allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                        
                      } else {
                        //incorrect signature
                        throw new InternalError(`no signature for approvable deposit`);
                      }

                    } else if (tx.txType == TxType.BridgeDeposit) {
                      // here is a deposit transaction (permittable token)
                      // source address in the memo block (20 bytes, starts from 16 bytes offset)
                      const depositHolderAddr = '0x' + tx.memo.substr(32, 40);  // TODO: Check it!

                      const rec = await HistoryRecord.deposit(depositHolderAddr, tx.tokenAmount, feeAmount, ts, txHash, pending);
                      allRecords.push(HistoryRecordIdx.create(rec, memo.index));

                    } else if (tx.txType == TxType.Transfer) {
                      // there are 2 cases: 
                      if (memo.acc) {
                        // 1. we initiated it => outcoming tx(s)
                        const transfers = await Promise.all(memo.outNotes.map(async ({note, index}) => {
                          const destAddr = await this.worker.assembleAddress(note.d, note.p_d);
                          return {to: destAddr, amount: BigInt(note.b)};
                        }));;

                        if (transfers.length == 0) {
                          const rec = await HistoryRecord.aggregateNotes(feeAmount, ts, txHash, pending);
                          allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                        } else {
                          const rec = await HistoryRecord.transferOut(transfers, feeAmount, ts, txHash, pending, getIsLoopback);
                          allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                        }
                      } else {
                        // 2. somebody initiated it => incoming tx(s)

                        const transfers = await Promise.all(memo.inNotes.map(async ({note, index}) => {
                          const destAddr = await this.worker.assembleAddress(note.d, note.p_d);
                          return {to: destAddr, amount: BigInt(note.b)};
                        }));

                        const rec = await HistoryRecord.transferIn(transfers, BigInt(0), ts, txHash, pending);
                        allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                      }
                    } else if (tx.txType == TxType.Withdraw) {
                      // withdrawal transaction (destination address in the memoblock)
                      const withdrawDestAddr = '0x' + tx.memo.substr(32, 40);

                      const rec = await HistoryRecord.withdraw(withdrawDestAddr, -(tx.tokenAmount + feeAmount), feeAmount, ts, txHash, pending);
                      allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                    }

                    // if we found txHash in the blockchain -> remove it from the saved tx array
                    if (pending) {
                      // if tx is in pending state - remove it only on success
                      const txReceipt = await this.web3.eth.getTransactionReceipt(txHash);
                      if (txReceipt && txReceipt.status !== undefined && txReceipt.status == true) {
                        this.removePendingTxByTxHash(txHash);
                      }
                    } else {
                      this.removePendingTxByTxHash(txHash);
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
        const records = this.sentTxs.get(txHash);
        if (records !== undefined) {
          console.log(`HistoryStorage: tx ${txHash} isn't indexed yet, but we have ${records.length} associated history record(s)`);
          return records.map((oneRecord, index) => HistoryRecordIdx.create(oneRecord, memo.index + index));
        } else {
          console.warn(`HistoryStorage: cannot fetch tx ${txHash} and no local associated records`);
        }
      }

      // Cannot retrieve transaction info
      // and there are no associated records
      return [];

    }

    throw new InternalError(`Cannot find txHash for memo at index ${memo.index}`);
  }

}
