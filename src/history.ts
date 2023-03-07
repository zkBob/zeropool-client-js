import { openDB, IDBPDatabase } from 'idb';
import Web3 from 'web3';
import { Account, Note, TxMemoChunk, IndexedTx, ParseTxsResult, TxInput } from 'libzkbob-rs-wasm-web';
import { ShieldedTx, TxType } from './tx';
import { bigintToArrayLe, bufToHex, HexStringWriter, hexToBuf, toCanonicalSignature } from './utils';
import { CONSTANTS } from './constants';
import { InternalError } from './errors';

const LOG_HISTORY_SYNC = false;
const MAX_SYNC_ATTEMPTS = 3;  // if sync was not fully completed due to RPR errors

export enum HistoryTransactionType {
  Deposit = 1,
  TransferIn,
  TransferOut,
  Withdrawal,
  AggregateNotes,
  DirectDeposit,
}

export enum HistoryRecordState {
  Pending = 1,
  Mined,
  RejectedByRelayer,
  RejectedByPool,
}

export interface RevealedMemo {
  index: number;
  encChunks: { data: Uint8Array, index: number }[]; // chunk: encrypted account or note
  ecdhKeys:  { key: Uint8Array, index: number }[];  // keys to decrypting chunks at the corresponding indexes
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

enum PoolSelector {
  Transact = "af989083",
  AppendDirectDeposit = "1dc4cb33",
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

  public static async directDeposit(
    transfers: {to: string, amount: bigint}[],
    fee: bigint,
    ts: number,
    txHash: string,
    pending: boolean
  ): Promise<HistoryRecord> {
    const actions: TokensMoving[] = transfers.map(({to, amount}) => { return ({from: "", to, amount, isLoopback: false}) });
    const state: HistoryRecordState = pending ? HistoryRecordState.Pending : HistoryRecordState.Mined;
    return new HistoryRecord(HistoryTransactionType.DirectDeposit, ts, actions, fee, txHash, state);
  }

  public toJson(): string {
    return JSON.stringify(this, (_, v) => typeof v === 'bigint' ? `${v}n` : v)
        .replace(/"(-?\d+)n"/g, (_, a) => a);
  }
}

class HistoryRecordIdx {
  index: number;
  record: HistoryRecord;

  public static create(record: HistoryRecord, index: number): HistoryRecordIdx {
    const result = new HistoryRecordIdx();
    result.index = index;
    result.record = record;

    return result;
  }
}

export class ComplianceHistoryRecord extends HistoryRecord {
  // the first leaf (account) index
  public index: number;
  // used to chaining accounts
  // nullifiers are undefined for incoming transfers
  public nullifier?: Uint8Array; // for the input account
  public nextNullifier?: Uint8Array; // for the output account (will be used in the next tx)
  // encrypted elements (chunk: encrypted account or note)
  public encChunks: { data: Uint8Array, index: number }[];
  // keys to decrypting chunks at the corresponding indexes
  public ecdhKeys:  { key: Uint8Array, index: number }[];
  // decrypted elements
  public acc?: Account;
  // decrypted notes
  public notes:  { note: Note, index: number }[]; // incoming notes (TransferIn case)
  // transaction inputs (undefined for incoming txs)
  public inputs?: {
    account: {index: number, account: Account},
    intermediateNullifier: string,
    notes: {index: number, note: Note}[],
  };

  constructor(
    rec: HistoryRecord,
    index: number,
    nullifier: Uint8Array | undefined,  // undefined for incoming transfers
    nextNullifier: Uint8Array | undefined, // undefined for incoming transfers
    memo: DecryptedMemo,
    chunks: TxMemoChunk[],
    inputs: TxInput | undefined, // undefined for incoming transfers
  ) {
    super(rec.type, rec.timestamp, rec.actions, rec.fee, rec.txHash, rec.state, rec.failureReason);

    this.index = index;
    this.nullifier = nullifier;
    this.nextNullifier = nextNullifier;
    this.encChunks = chunks.map(aChunk => { return {data: new Uint8Array(aChunk.encrypted), index: aChunk.index} });
    this.ecdhKeys = chunks.map(aChunk => { return {key: new Uint8Array(aChunk.key), index: aChunk.index} });
    this.acc = memo.acc;
    this.notes = [...memo.inNotes,
                  ...memo.outNotes.filter(aNote => 
                      // in case of loopback transfer the associated notes
                      // can persist in the both arrays (IN/OUT)
                      // so we should to avoid notes duplications
                      memo.inNotes.find(anotherNote => 
                        aNote.index == anotherNote.index
                      ) === undefined
                    )
                  ];
    this.inputs = inputs;
  }
}


const TX_TABLE = 'TX_STORE';
const TX_FAILED_TABLE = 'TX_FAILED_STORE';
const DECRYPTED_MEMO_TABLE = 'DECRYPTED_MEMO';
const DECRYPTED_PENDING_MEMO_TABLE = 'DECRYPTED_PENDING_MEMO';
const HISTORY_STATE_TABLE = 'HISTORY_STATE';
const NATIVE_TX_TABLE = 'NATIVE_TX';

// History storage holds the parsed history records corresponding to the current account
// and transaction hashes (on the native chain) which are needed for the history retrieving

export class HistoryStorage {
  private db: IDBPDatabase;
  private syncIndex = -1;
  private syncAttempts = 0;
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
    const db = await openDB(`zeropool.${db_id}.history`, 4, {
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
        if (oldVersion < 4) {
          db.createObjectStore(NATIVE_TX_TABLE);
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

    // getting unprocessed memo arrays (greater than sync index)
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
        console.log(`[HistoryStorage] old history record was found! Clean deprecated records...`);
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

    // getting failured memo list and include it in unprocessed one
    // (memos which are placed below syncIndex but wasn't converted to the HistoryRecord for any reason)
    const failSyncRecords: number[] = await this.db.get(HISTORY_STATE_TABLE, 'fail_indexes');
    if (failSyncRecords) {
      await Promise.all(failSyncRecords.map(async (idx) => {
        const lostMemo: DecryptedMemo = await this.db.get(DECRYPTED_MEMO_TABLE, idx);
        if (lostMemo) {
          this.unparsedMemo.set(idx, lostMemo);
          console.log(`[HistoryStorage] found lost memo @${idx}`);
        } else {
          console.warn(`[HistoryStorage] memo @${idx} was marked as lost but no source memo was found`);
        }
      }));
    } else {
      // It's seems we faced with that array for the first time
      // Let's check all history for the leaked records
      console.log(`[HistoryStorage] checking history for the lost records...`);
      // we assume that every unprocessed memo should have associated HistoryRecord with the same index
      let recIndexes = [...this.currentHistory.keys()];
      let cursor = await this.db.transaction(DECRYPTED_MEMO_TABLE).store.openCursor();
      while (cursor) {
        if (!recIndexes.includes(Number(cursor.primaryKey))) {
          console.warn(`[HistoryStorage] found lost which has no associated HistoryRecord @${Number(cursor.primaryKey)}`);
          this.unparsedMemo.set(Number(cursor.primaryKey), cursor.value);
        }
        cursor = await cursor.continue();
      }
    }

    console.log(`[HistoryStorage] preload ${this.currentHistory.size} history records, ${this.unparsedMemo.size} + ${this.unparsedPendingMemo.size}(pending) unparsed memos (synced from ${this.syncIndex + 1})`);
  }

  public async getAllHistory(getIsLoopback: (shieldedAddress: string) => Promise<boolean>): Promise<HistoryRecord[]> {
    if (this.syncHistoryPromise == undefined) {
      this.syncHistoryPromise = new Promise<void>(async (resolve) => {
        this.syncAttempts = 0;
        let result = false;
        do {
          if (this.syncAttempts++ > 0) {
            console.warn(`[HistoryStorage] history retry attempt #${this.syncAttempts} (${this.unparsedMemo.size} memo were not converted yet)`);
          }
          result = await this.syncHistory(getIsLoopback);
          if (result) {
            break;
          }
        } while(this.syncAttempts < MAX_SYNC_ATTEMPTS);

        if (!result) {
          console.warn(`[HistoryStorage] cannot fully sync history after ${this.syncAttempts} attempts (${this.unparsedMemo.size} memo were not converted yet)`);
        }
        resolve();
      }).catch((err) => {
        console.error(`[HistoryStorage]: unexpected error occured during history sync: ${err.message}`);
      }).finally(() => {
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

  // the history should be synced before invoking that method
  // timestamps are milliseconds, low bound is inclusively
  public async getComplianceReport(fromTimestamp: number | null, toTimestamp: number | null, sk: Uint8Array, tokenAddress: string): Promise<ComplianceHistoryRecord[]> {
    let complienceRecords: ComplianceHistoryRecord[] = [];
    
    for (const [treeIndex, value] of  this.currentHistory.entries()) {
      const recTs = value.timestamp * 1000;
      if (recTs >= (fromTimestamp ?? 0) &&
          recTs < (toTimestamp ?? Number.MAX_VALUE) &&
          value.state == HistoryRecordState.Mined
      ) {
        const calldata = await this.getNativeTx(treeIndex, value.txHash);
        if (calldata && calldata.blockNumber && calldata.input) {
          try {
            const tx = ShieldedTx.decode(calldata.input);
            if (tx.selector.toLowerCase() == PoolSelector.Transact) {

              const memoblock = hexToBuf(tx.ciphertext);

              let decryptedMemo = await this.getDecryptedMemo(treeIndex, false);
              if (!decryptedMemo) {
                // If the decrypted memo cannot be retrieved from the database => decrypt it again
                const indexedTx: IndexedTx = {
                  index: treeIndex,
                  memo: tx.ciphertext,
                  commitment: bufToHex(bigintToArrayLe(tx.outCommit)),
                }
                const res: ParseTxsResult = (await this.worker.parseTxs(sk, [indexedTx])).decryptedMemos;
                if (res.decryptedMemos.length == 1) {
                  decryptedMemo = res.decryptedMemos[0];
                } else {
                  throw new InternalError(`Cannot decrypt tx. Excepted 1 memo, got ${res.decryptedMemos.length}`);
                }
              }

              const chunks: TxMemoChunk[] = await this.worker.extractDecryptKeys(sk, BigInt(treeIndex), memoblock);

              let nullifier: Uint8Array | undefined;
              let inputs: TxInput | undefined;
              let nextNullifier: Uint8Array | undefined;
              if (value.type != HistoryTransactionType.TransferIn) {
                // tx is user-initiated
                nullifier = bigintToArrayLe(tx.nullifier);
                inputs = await this.worker.getTxInputs(tokenAddress, BigInt(treeIndex));
                if (decryptedMemo && decryptedMemo.acc) {
                  const strNullifier = await this.worker.calcNullifier(tokenAddress, decryptedMemo.acc, BigInt(decryptedMemo.index));
                  const writer = new HexStringWriter();
                  writer.writeBigInt(BigInt(strNullifier), 32, true);
                  nextNullifier = hexToBuf(writer.toString());
                } else {
                  throw new InternalError(`Account was not decrypted @${treeIndex}`);
                }
              }

              // TEST-ONLY: I'll remove it before merging
              // Currently you could check key extracting correctness with that code
              for (const aChunk of chunks) {
                if(aChunk.index == treeIndex) {
                  // account
                  const restoredAcc = await this.worker.decryptAccount(aChunk.key, aChunk.encrypted);
                  if (JSON.stringify(restoredAcc) != JSON.stringify(decryptedMemo?.acc)) {
                    throw new InternalError(`Cannot restore source account @${aChunk.index} from the compliance report!`);
                  }
                } else if (decryptedMemo) {
                  // notes
                  const restoredNote = await this.worker.decryptNote(aChunk.key, aChunk.encrypted);
                  let srcNote: Note | undefined;
                  for (const aNote of decryptedMemo.outNotes) {
                    if (aNote.index == aChunk.index) { srcNote = aNote.note; break; }
                  }
                  if (!srcNote) {
                    for (const aNote of decryptedMemo.inNotes) {
                      if (aNote.index == aChunk.index) { srcNote = aNote.note; break; }
                    } 
                  }

                  if (!srcNote) {
                    throw new InternalError(`Cannot find associated note @${aChunk.index} to check decryption!`);
                  } else if ( JSON.stringify(restoredNote) != JSON.stringify(srcNote)) {
                    throw new InternalError(`Cannot restore source note @${aChunk.index} from the compliance report!`);
                  }
                }
              };
              
              const aRec = new ComplianceHistoryRecord(value, treeIndex, nullifier, nextNullifier, decryptedMemo, chunks, inputs);
              complienceRecords.push(aRec);
            } else {
              throw new InternalError(`Cannot decode calldata for tx @ ${treeIndex}: incorrect selector ${tx.selector}`);
            }
          }
          catch (e) {
            throw new InternalError(`Cannot generate compliance report for tx @ ${treeIndex}: ${e}`);
          }
        } else {
          console.warn(`[HistoryStorage]: cannot get calldata for tx at index ${treeIndex}`);
        }
      }
    };

    return complienceRecords;
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
    await this.db.delete(NATIVE_TX_TABLE, IDBKeyRange.lowerBound(rollbackIndex));

    // update sync_index
    this.syncIndex = new_sync_index
    if (this.syncIndex < 0) {
      this.db.delete(HISTORY_STATE_TABLE, 'sync_index');
    } else {
      this.db.put(HISTORY_STATE_TABLE, this.syncIndex, 'sync_index');
    }

    // remove failed indexes if needed
    let failSyncRecords: number[] = await this.db.get(HISTORY_STATE_TABLE, 'fail_indexes');
    if (failSyncRecords) {
      failSyncRecords = failSyncRecords.filter(idx => idx < rollbackIndex);
      await this.db.put(HISTORY_STATE_TABLE, failSyncRecords, 'fail_indexes');
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
    await this.db.clear(NATIVE_TX_TABLE);

    // Clean local cache
    this.syncIndex = -1;
    this.unparsedMemo.clear();
    this.unparsedPendingMemo.clear();
    this.currentHistory.clear();
    this.failedHistory = [];
  }

  // ------- Private routines --------

  // Returns true if there is all unparsed memo were converted to the HistoryRecords
  // If one or more transactions were postponed due to recoverable error - return false
  // Pending transactions are not influence on the return value (in case of error it will re-fetched in the next time)
  // The method can be throw an error in case of unrecoverable error

  private async syncHistory(getIsLoopback: (shieldedAddress: string) => Promise<boolean>): Promise<boolean> {
    const startTime = Date.now();

    if (this.unparsedMemo.size > 0 || this.unparsedPendingMemo.size > 0) {
      console.log(`[HistoryStorage] starting memo synchronizing from the index ${this.syncIndex + 1} (${this.unparsedMemo.size} + ${this.unparsedPendingMemo.size}(pending) unprocessed memos)`);

      const historyPromises: Promise<HistoryRecordIdx[]>[] = [];
      
      // process mined memos
      const processedIndexes: number[] = [];
      const unprocessedIndexes: number[] = [];
      for (const oneMemo of this.unparsedMemo.values()) {
        const hist = this.convertToHistory(oneMemo, false, getIsLoopback).then( records => {
          if (records.length > 0) {
            processedIndexes.push(oneMemo.index);
          } else {
            // collect unprocessed indexes as well
            // (the reason is most likely RPC failure)
            unprocessedIndexes.push(oneMemo.index)
          }

          return records;
        });
        historyPromises.push(hist);
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
            console.log(`[HistoryStorage] history record @${oneRec.index} has been created`);
          }

          this.currentHistory.set(oneRec.index, oneRec.record);

          if (oneRec.record.state == HistoryRecordState.Mined) {
            // save history record only for mined transactions
            this.put(oneRec.index, oneRec.record);
            
            newSyncIndex = oneRec.index;
          }
        }
      }

      if (unprocessedIndexes.length > 0) {
        console.warn(`[HistoryStorage] unprocessed: ${unprocessedIndexes.sort().map((idx) => `@${idx}`).join(', ')}`);
      }

      // we should save unprocessed records to restore them in case of library reload
      this.db.put(HISTORY_STATE_TABLE, unprocessedIndexes, 'fail_indexes');

      for (const oneIndex of processedIndexes) {
        this.unparsedMemo.delete(oneIndex);
      }

      this.syncIndex = Math.max(this.syncIndex, newSyncIndex);  // prevent sync index decreasing
      this.db.put(HISTORY_STATE_TABLE, this.syncIndex, 'sync_index');

      const timeMs = Date.now() - startTime;
      const remainsStr = unprocessedIndexes.length > 0 ? ` (${unprocessedIndexes.length} memos remain unprecessed)` : '';
      console.log(`[HistoryStorage] history has been synced up to index ${this.syncIndex}${remainsStr} in ${timeMs} msec (records: ${[...this.currentHistory.keys()].length})`);
    } else {
      // No any records (new or pending) => delete all pending history records
      for (const [index, record] of this.currentHistory.entries()) {
        if (record.state == HistoryRecordState.Pending) {
          this.currentHistory.delete(index);
        }
      }

      console.log(`[HistoryStorage] memo sync is not required: already up-to-date (on index ${this.syncIndex + 1})`);
    }

    return this.unparsedMemo.size == 0;
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
      const txData = await this.getNativeTx(memo.index, txHash);
      if (txData) {
        const block = await this.web3.eth.getBlock(txData.blockNumber).catch(() => null);
        if (block && block.timestamp) {
            let ts: number = 0;
            if (typeof block.timestamp === "number" ) {
                ts = block.timestamp;
            } else if (typeof block.timestamp === "string" ) {
                ts = Number(block.timestamp);
            }

            // Decode transaction data
            try {
              const txSelector = txData.input.slice(2, 10).toLowerCase();
              if (txSelector == PoolSelector.Transact) {
                // Here is a regular transaction (deposit/transfer/withdrawal)
                const tx = ShieldedTx.decode(txData.input);
                const feeAmount = BigInt('0x' + tx.memo.substr(0, 16))
                
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
                    const transfers = await Promise.all(memo.outNotes.map(async ({note}) => {
                      const destAddr = await this.worker.assembleAddress(note.d, note.p_d);
                      return {to: destAddr, amount: BigInt(note.b)};
                    }));

                    if (transfers.length == 0) {
                      const rec = await HistoryRecord.aggregateNotes(feeAmount, ts, txHash, pending);
                      allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                    } else {
                      const rec = await HistoryRecord.transferOut(transfers, feeAmount, ts, txHash, pending, getIsLoopback);
                      allRecords.push(HistoryRecordIdx.create(rec, memo.index));
                    }
                  } else {
                    // 2. somebody initiated it => incoming tx(s)

                    const transfers = await Promise.all(memo.inNotes.map(async ({note}) => {
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

              } else if (txSelector == PoolSelector.AppendDirectDeposit) {
                // Direct Deposit tranaction
                const transfers = await Promise.all(memo.inNotes.map(async ({note}) => {
                  const destAddr = await this.worker.assembleAddress(note.d, note.p_d);
                  return {to: destAddr, amount: BigInt(note.b)};
                }));

                const rec = await HistoryRecord.directDeposit(transfers, BigInt(0), ts, txHash, pending);
                return [HistoryRecordIdx.create(rec, memo.index)];
              } else {
                throw new InternalError(`Cannot decode calldata for tx ${txHash}: incorrect selector ${txSelector}`);
              }
            } catch (e) {
              // there is no workaround for that issue => throw Error
              throw new InternalError(`Cannot decode calldata for tx ${txHash}: ${e}`);
            }
          }

          // we shouldn't panic here: will retry in the next time
          console.warn(`[HistoryStorage] unable to fetch block ${txData.blockNumber} for tx @${memo.index}`);
      } else {
        // Look for a transactions, initiated by the user and try to convert it to the HistoryRecord
        const records = this.sentTxs.get(txHash);
        if (records !== undefined) {
          console.log(`[HistoryStorage] tx ${txHash} isn't indexed yet, but we have ${records.length} associated history record(s)`);
          return records.map((oneRecord, index) => HistoryRecordIdx.create(oneRecord, memo.index + index));
        } else {
          // we shouldn't panic here: will retry in the next time
          console.warn(`[HistoryStorage] cannot fetch tx ${txHash} and no local associated records`);
        }
      }

      // In some cases (e.g. unable to fetch tx) we should return a valid value
      // Otherwise top-level Promise.all() will failed
      return [];

    }

    throw new InternalError(`Cannot find txHash for memo at index ${memo.index}`);
  }

  private async getNativeTx(index: number, txHash: string | undefined = undefined): Promise<any> {
    const mask = (-1) << CONSTANTS.OUTLOG;
    const txIndex = index & mask;

    let calldata = await this.db.get(NATIVE_TX_TABLE, txIndex);
    if (!calldata) {
      // calldata for that index isn't presented in the DB => request it
      if (txHash === undefined) {
        // it's need to get txHash for that index first
        const decryptedMemo = await this.getDecryptedMemo(txIndex, false);  // only mined txs
        if (decryptedMemo && decryptedMemo.txHash) {
          txHash = decryptedMemo.txHash;
        } else {
          console.warn(`[HistoryStorage]: unable to retrieve txHash for tx at index ${txIndex}: no saved decrypted memo`);

          return null;
        }
      }

      try {
        const txData = await this.web3.eth.getTransaction(txHash);
        if (txData && txData.blockNumber && txData.input) {
          this.saveNativeTx(index, txData);

          return txData;
        } else {
          console.warn(`[HistoryStorage]: cannot get native tx ${txHash} (tx still not mined?)`);

          return null;
        }
      } catch (err) {
        console.warn(`[HistoryStorage]: cannot get native tx ${txHash} (${err.message})`);

        return null;
      }
    }

    return calldata;
  }

  private async saveNativeTx(index: number, txData: any): Promise<void> {
    const mask = (-1) << CONSTANTS.OUTLOG;
    const txIndex = index & mask;

    await this.db.put(NATIVE_TX_TABLE, txData, txIndex);
  }

}
