import { IDepositData, IDepositPermittableData, ITransferData, IWithdrawData,
          ParseTxsResult, ParseTxsColdStorageResult, StateUpdate,
          DecryptedMemo, IndexedTx, TreeNode, IAddressComponents, TxMemoChunk, TxInput,
          Account,
          Note,
      } from 'libzkbob-rs-wasm-web';
import { HistoryStorage } from './history'
import { bufToHex, isRangesIntersected } from './utils';
import { hash } from 'tweetnacl';
import { EphemeralPool } from './ephemeral';
import { NetworkType } from './network-type';
import { ColdStorageConfig } from './coldstorage';
import { InternalError } from './errors';
import { ZkBobRelayer } from './services/relayer';
import { CONSTANTS } from './constants';
import { NetworkBackend } from './networks/network';

const LOG_STATE_HOTSYNC = false;

const OUTPLUSONE = CONSTANTS.OUT + 1; // number of leaves (account + notes) in a transaction
const BATCH_SIZE = 1000;  // number of transactions per request during a sync state
const PARTIAL_TREE_USAGE_THRESHOLD = 500; // minimum tx count in Merkle tree to partial tree update using
const CORRUPT_STATE_ROLLBACK_ATTEMPTS = 2; // number of state restore attempts (via rollback)
const CORRUPT_STATE_WIPE_ATTEMPTS = 5; // number of state restore attempts (via wipe)
const COLD_STORAGE_USAGE_THRESHOLD = 1000;  // minimum number of txs to cold storage using
const MIN_TX_COUNT_FOR_STAT = 10;


export interface BatchResult {
  txCount: number;
  maxMinedIndex: number;
  maxPendingIndex: number;
  hasOwnOptimisticTxs: boolean;
  state: Map<number, StateUpdate>;  // key: first tx index, 
                                    // value: StateUpdate object (notes, accounts, leafs and comminments)
}

interface RawTxsBatch {
  fromIndex: number;
  count: number
  minedTxs: IndexedTx[];
  pendingTxs: IndexedTx[];
  txHashes: Record<number, string>;
  maxMinedIndex: number;
  maxPendingIndex: number;
}

export interface StateSyncInfo {
  txCount: number;
  startTimestamp: number;
  endTimestamp?: number;
}


// Used to collect state synchronization statistic
// It could be helpful to monitor average sync time
export interface SyncStat {
  txCount: number;  // total txs count (relayer + CDN)
  cdnTxCnt: number; // number of transactions fetched in binary format from CDN (cold storage)
  decryptedLeafs: number; // deposit/withdrawal = 1 leaf,
                          // transfer = 1 + notes_cnt leafs
  fullSync: boolean;  // true in case of bulding full Merkle tree on the client

  totalTime: number; // msec
  timePerTx: number;  // msec
}

export interface PartialSyncResult {
  txCount: number;  // total txs count (relayer + CDN)
  decryptedLeafs: number; // deposit/withdrawal = 1 leaf,
                          // transfer = 1 + notes_cnt leafs
  firstIndex: number; // first index of the synced range
  nextIndex: number;  // index after synced range
  totalTime: number; // msec
}


export class ZkBobState {
  public stateId: string; // should depends on pool and sk
  private sk: Uint8Array;
  private birthIndex?: number;
  private network: NetworkBackend;
  public history?: HistoryStorage; // should work synchronically with the state
  private ephemeralAddrPool?: EphemeralPool; // depends on sk so we placed it here
  private worker: any;
  private updateStatePromise: Promise<boolean> | undefined;
  private syncStats: SyncStat[] = [];
  private skipColdStorage: boolean = false;

  // State self-healing
  private rollbackAttempts = 0;
  private wipeAttempts = 0;
  
  // Mapping shieldedAddress -> isOwnAddress (local cache)
  // need to decrease time in isOwnAddress() function 
  private shieldedAddressCache = new Map<string, Promise<boolean>>();

  // Sync info
  private lastSyncInfo?: StateSyncInfo;


  // Create regular state with the provided spending key
  // and other parameters
  public static async create(
    sk: Uint8Array,
    birthIndex: number | undefined,
    network: NetworkBackend,
    networkName: string,
    rpcUrl: string,
    denominator: bigint,
    poolId: number,
    tokenAddress: string,
    worker: any,
  ): Promise<ZkBobState> {
    const zpState = new ZkBobState();
    zpState.sk = new Uint8Array(sk);
    zpState.birthIndex = birthIndex;
    
    const userId = bufToHex(hash(zpState.sk)).slice(0, 32);
    zpState.stateId = `${networkName}.${poolId.toString(16).padStart(6, '0')}.${userId}`; // database name identifier

    zpState.network = network;

    await worker.createAccount(zpState.stateId, zpState.sk, poolId, networkName);
    zpState.worker = worker;
    
    zpState.history = await HistoryStorage.init(zpState.stateId, rpcUrl, zpState);


    zpState.ephemeralAddrPool = await EphemeralPool.init(zpState.sk, tokenAddress, networkName as NetworkType, rpcUrl, denominator);

    return zpState;
  }

  // Create a naked state without history and ephemeral pool
  // Could be used for redeeming gift-cards
  public static async createNaked(
    sk: Uint8Array,
    birthIndex: number | undefined,
    networkName: string,
    poolId: number,
    worker: any,
  ): Promise<ZkBobState> {
    const zpState = new ZkBobState();
    zpState.sk = new Uint8Array(sk);
    zpState.birthIndex = birthIndex;

    const userId = bufToHex(hash(zpState.sk)).slice(0, 32);
    zpState.stateId = `${networkName}.${poolId.toString(16).padStart(6, '0')}.${userId}`; // database name identifier

    await worker.createAccount(zpState.stateId, zpState.sk, poolId, networkName);
    zpState.worker = worker;

    return zpState;
  }

  // returns undefined if state sync not in progress
  public curSyncInfo(): StateSyncInfo | undefined {
    if (this.updateStatePromise && this.lastSyncInfo) {
      return this.lastSyncInfo
    }

    return undefined;
  }

  public ephemeralPool(): EphemeralPool {
    if (!this.ephemeralAddrPool) {
      throw new InternalError(`The state ${this.stateId} doesn't have ephemeral pool`);
    }
    return this.ephemeralAddrPool;
  }

  // in Gwei
  public async getTotalBalance(): Promise<bigint> {
    return BigInt(await this.worker.totalBalance(this.stateId));
  }

  // in Gwei
  public async getBalances(): Promise<[bigint, bigint, bigint]> {
    const total = BigInt(await this.worker.totalBalance(this.stateId));
    const acc = BigInt(await this.worker.accountBalance(this.stateId));
    const note = BigInt(await this.worker.noteBalance(this.stateId));

    return [total, acc, note];
  }

  // in Gwei
  public async accountBalance(): Promise<bigint> {
    return BigInt(await this.worker.accountBalance(this.stateId));
  }

  public async usableNotes(): Promise<any[]> {
    return await this.worker.usableNotes(this.stateId);
  }

  public async getRoot(): Promise<bigint> {
    return BigInt(await this.worker.getRoot(this.stateId));
  }

  public async getRootAt(index: bigint): Promise<bigint> {
    return BigInt(await this.worker.getRootAt(this.stateId, index));
  }

  public async getLeftSiblings(index: bigint): Promise<TreeNode[]> {
    return await this.worker.getLeftSiblings(this.stateId, index);
  }

  public async getNextIndex(): Promise<bigint> {
    return await this.worker.nextTreeIndex(this.stateId);
  }

  public async getFirstIndex(): Promise<bigint | undefined> {
    return await this.worker.firstTreeIndex(this.stateId);
  }

  public async rawState(): Promise<any> {
    return await this.worker.rawState(this.stateId);
  }

  // Wipe whole user's state
  public async rollback(rollbackIndex: bigint): Promise<bigint> {
    const realRollbackIndex = await this.worker.rollbackState(this.stateId, rollbackIndex);
    await this.history?.rollbackHistory(Number(realRollbackIndex));

    return realRollbackIndex;
  }

  // Wipe whole user's state
  public async clean(): Promise<void> {
    await this.worker.wipeState(this.stateId);
    await this.history?.cleanHistory();
  }

  public async free(): Promise<void> {
    await this.worker.free(this.stateId);
    this.sk.fill(0);
  }

  public async generateAddress(): Promise<string> {
    return await this.worker.generateAddress(this.stateId);
  }

  public async generateUniversalAddress(): Promise<string> {
    return await this.worker.generateUniversalAddress(this.stateId);
  }

  public async generateAddressForSeed(seed: Uint8Array): Promise<string> {
    return await this.worker.generateAddressForSeed(this.stateId, seed);
  }

  public async verifyShieldedAddress(shieldedAddress: string): Promise<boolean> {
    return await this.worker.verifyShieldedAddress(this.stateId, shieldedAddress);
  }

  public async isOwnAddress(shieldedAddress: string): Promise<boolean> {
    let res = this.shieldedAddressCache.get(shieldedAddress);
    if (res === undefined) {
      res = this.worker.isOwnAddress(this.stateId, shieldedAddress);
      this.shieldedAddressCache.set(shieldedAddress, res!);
    }

    return res!;
  }

  public async assembleAddress(d: string, p_d: string): Promise<string> {
    return this.worker.assembleAddress(this.stateId, d, p_d);
  }

  // Converts zk-addresss from the old prefixless format to the new chain-specific one
  public async convertAddress(shieldedAddress: string): Promise<string> {
    return await this.worker.convertAddressToChainSpecific(this.stateId, shieldedAddress);
  }

  public async parseAddress(shieldedAddress: string): Promise<IAddressComponents> {
    return this.worker.parseAddress(this.stateId, shieldedAddress);
  }

  public async createDepositPermittable(deposit: IDepositPermittableData): Promise<any> {
    return await this.worker.createDepositPermittable(this.stateId, deposit);
  }

  public async createTransferOptimistic(tx: ITransferData, optimisticState: any): Promise<any> { 
    return await this.worker.createTransferOptimistic(this.stateId, tx, optimisticState);
  }

  public async createWithdrawalOptimistic(tx: IWithdrawData, optimisticState: any): Promise<any> {
    return await this.worker.createWithdrawalOptimistic(this.stateId, tx, optimisticState);
  }

  public async createDeposit(deposit: IDepositData): Promise<any> {
    return await this.worker.createDeposit(this.stateId, deposit);
  }

  public async createTransfer(transfer: ITransferData): Promise<any> {
    return await this.worker.createTransfer(this.stateId, transfer);
  }

  public async lastVerifiedIndex(): Promise<bigint> {
    return await this.worker.getTreeLastStableIndex(this.stateId);
  }

  public async setLastVerifiedIndex(index: bigint): Promise<bigint> {
    return await this.worker.setTreeLastStableIndex(this.stateId, index);
  }

  public async updateStateColdStorage(bulks: Uint8Array[], indexFrom?: bigint, indexTo?: bigint): Promise<any> {
    return await this.worker.updateStateColdStorage(this.stateId, bulks, indexFrom, indexTo);
  }

  public async updateState(
    relayer: ZkBobRelayer,
    getPoolRoot: (index: bigint) => Promise<bigint>,
    coldConfig?: ColdStorageConfig,
    coldBaseAddr?: string,
  ): Promise<boolean> {
    if (this.updateStatePromise == undefined) {
      this.updateStatePromise = this.updateStateOptimisticWorker(relayer, getPoolRoot, coldConfig, coldBaseAddr).finally(() => {
        this.updateStatePromise = undefined;
      });
    } else {
      console.info(`The state currently updating, waiting for finish...`);
    }

    return this.updateStatePromise;
  }

  // returns is ready to transact
  private async updateStateOptimisticWorker(
    relayer: ZkBobRelayer,
    getPoolRoot: (index: bigint) => Promise<bigint>,
    coldConfig?: ColdStorageConfig,
    coldBaseAddr?: string,
  ): Promise<boolean> {
    this.lastSyncInfo = {txCount: 0, startTimestamp: Date.now()}
    let startIndex = Number(await this.getNextIndex());

    const stateInfo = await relayer.info();
    const nextIndex = Number(stateInfo.deltaIndex);
    const optimisticIndex = Number(stateInfo.optimisticDeltaIndex);

    let isReadyToTransact = true;

    if (optimisticIndex > startIndex) {
      // Use partial tree loading if possible
      let birthindex = this.birthIndex ?? 0;
      if (birthindex >= Number(stateInfo.deltaIndex)) {
        // we should grab almost one transaction from the regular state
        birthindex = Number(stateInfo.deltaIndex) - OUTPLUSONE;
      }
      let siblings: TreeNode[] | undefined;
      if (startIndex == 0 && birthindex >= (PARTIAL_TREE_USAGE_THRESHOLD * OUTPLUSONE)) {
        try {
          siblings = await relayer.siblings(birthindex);
          console.log(`🍰[PartialSync] got ${siblings.length} sibling(s) for index ${birthindex}`);
          startIndex = birthindex;
        } catch (err) {
          console.warn(`🍰[PartialSync] cannot retrieve siblings: ${err}`);
        }
      }

      // Getting start sync operation timestamp
      const startSyncTime = Date.now();

      // now we got actual txs count to sync => update info
      this.lastSyncInfo.txCount = (optimisticIndex - startIndex) /  OUTPLUSONE;

      // Try to using the cold storage if possible
      const coldResultPromise = this.loadColdStorageTxs(getPoolRoot, coldConfig, coldBaseAddr, startIndex);

      // Start the hot sync simultaneously with the cold sync
      const assumedNextIndex = this.nextIndexAfterColdSync(coldConfig, startIndex);
      let hotSyncPromise = this.startHotSync(relayer, assumedNextIndex, optimisticIndex);

      // Waiting while cold sync finished (local state becomes updated)
      const coldResult = await coldResultPromise;

      // Check is predicted next index after the cold sync equals actual one
      if (coldResult.nextIndex != assumedNextIndex) {
        // ... restarting the hot sync with the appropriate index otherwise 
        console.error(`🧊[ColdSync] next index not as assumed after sync (next index = ${coldResult.nextIndex}, assumed ${assumedNextIndex}) => starting hot sync again`);
        hotSyncPromise = this.startHotSync(relayer, coldResult.nextIndex, optimisticIndex);
      }

      const curStat: SyncStat = {
        txCount: (optimisticIndex - startIndex) / OUTPLUSONE,
        cdnTxCnt: coldResult.txCount,
        decryptedLeafs: coldResult.decryptedLeafs,
        fullSync: startIndex == 0 ? true : false,
        totalTime: coldResult.totalTime,
        timePerTx: 0,
      };

      // Waiting while batches for hot sync are ready
      const totalState = new Map<number, StateUpdate>();
      const initRes: BatchResult = {txCount: 0, maxMinedIndex: -1, maxPendingIndex: -1, hasOwnOptimisticTxs: false, state: totalState};
      const totalRes = (await hotSyncPromise).reduce((acc, cur) => {
        return {
          txCount: acc.txCount + cur.txCount,
          maxMinedIndex: Math.max(acc.maxMinedIndex, cur.maxMinedIndex),
          maxPendingIndex: Math.max(acc.maxPendingIndex, cur.maxPendingIndex),
          hasOwnOptimisticTxs: acc.hasOwnOptimisticTxs || cur.hasOwnOptimisticTxs,
          state: new Map([...Array.from(acc.state.entries()), ...Array.from(cur.state.entries())]),
        }
      }, initRes);

      const startSavingTime = Date.now();
      console.log(`🔥[HotSync] all batches were processed. Saving...`);
      // Saving parsed transaction from the hot sync in the local Merkle tree
      const idxs = [...totalRes.state.keys()].sort((i1, i2) => i1 - i2);
      for (const idx of idxs) {
        const oneStateUpdate = totalRes.state.get(idx);
        if (oneStateUpdate !== undefined) {
          try {
            await this.worker.updateState(this.stateId, oneStateUpdate, siblings);
          } catch (err) {
            const siblingsDescr = siblings !== undefined ? ` (+ ${siblings.length} siblings)` : '';
            console.warn(`🔥[HotSync] cannot update state from index ${idx}${siblingsDescr}`);
            if (siblings != undefined) {
              // if we try to update state with siblings and got an error - do not use partial sync again
              this.birthIndex = undefined;
            }
            throw new InternalError(`Unable to synchronize pool state`);
          }

          curStat.decryptedLeafs += oneStateUpdate.newLeafs.length;
        } else {
          throw new InternalError(`Cannot find state batch at index ${idx}`);
        }
      }

      console.log(`🔥[HotSync] Saved local state in ${Date.now() - startSavingTime} ms`);

      // remove unneeded pending records
      this.history?.setLastMinedTxIndex(totalRes.maxMinedIndex);
      this.history?.setLastPendingTxIndex(totalRes.maxPendingIndex);


      const fullSyncTime = Date.now() - startSyncTime;
      const fullSyncTimePerTx = fullSyncTime / (coldResult.txCount + totalRes.txCount);

      curStat.txCount = totalRes.txCount + coldResult.txCount;
      curStat.cdnTxCnt = coldResult.txCount;
      curStat.totalTime = fullSyncTime;
      curStat.timePerTx = fullSyncTimePerTx;

      // save relevant stats only
      if (curStat.txCount >= MIN_TX_COUNT_FOR_STAT) {
        this.syncStats.push(curStat);
      }

      isReadyToTransact = !totalRes.hasOwnOptimisticTxs;

      const syncType = coldResult.txCount > 0 ? '🧊🔥[TotalSync]' : '🔥[HotSync]'
      console.log(`${syncType} finished in ${curStat.totalTime / 1000} sec | ${curStat.txCount} tx, avg speed ${curStat.timePerTx.toFixed(1)} ms/tx`);
    } else {
      this.history?.setLastMinedTxIndex(nextIndex - OUTPLUSONE);
      this.history?.setLastPendingTxIndex(-1);

      console.log(`Local state is up to date @${startIndex}`);
    }

    // Self-healing code
    const checkIndex = await this.getNextIndex();
    const stableIndex = await this.lastVerifiedIndex();
    if (checkIndex != stableIndex) {
      const isStateCorrect = await this.verifyState(getPoolRoot);
      if (!isStateCorrect) {
        console.log(`🚑[StateVerify] Merkle tree root at index ${checkIndex} mistmatch!`);
        if (stableIndex > 0 && stableIndex < checkIndex &&
          this.rollbackAttempts < CORRUPT_STATE_ROLLBACK_ATTEMPTS
        ) {
          let realRollbackIndex = await this.rollback(stableIndex);
          console.log(`🚑[StateVerify] The user state was rollbacked to index ${realRollbackIndex} [attempt ${this.rollbackAttempts + 1}]`);
          this.rollbackAttempts++;
        } else if (this.wipeAttempts < CORRUPT_STATE_WIPE_ATTEMPTS) {
          await this.clean();
          console.log(`🚑[StateVerify] Full user state was wiped [attempt ${this.wipeAttempts + 1}]...`);

          if(this.rollbackAttempts > 0) {
            // If the first wipe has no effect
            // reset account birthday if presented
            this.birthIndex = undefined;
          }

          this.wipeAttempts++;
        } else {
          throw new InternalError(`Unable to synchronize pool state`);
        }

        // resync the state
        return await this.updateStateOptimisticWorker(relayer, getPoolRoot, coldConfig, coldBaseAddr);
      } else {
        this.rollbackAttempts = 0;
        this.wipeAttempts = 0;
      }
    }

    // set finish sync timestamp
    this.lastSyncInfo.endTimestamp = Date.now();

    return isReadyToTransact;
  }

  // Returns prepared data to include in the local Merkle tree
  // 1. Fetch all needed tx batches
  // 2. Parse batches
  private async startHotSync(relayer: ZkBobRelayer, fromIndex: number, toIndex: number): Promise<BatchResult[]> {
    let hotSyncPromises: Promise<BatchResult>[] = [];
    for (let i = fromIndex; i <= toIndex; i = i + BATCH_SIZE * OUTPLUSONE) {
      hotSyncPromises.push(this.fetchBatch(relayer, i, BATCH_SIZE).then((aBatch) => {
        // batch fetched, let's parse it!
        return this.parseBatch(aBatch);
      }));
    }

    return Promise.all(hotSyncPromises);
  }

  // Get the transactions from the relayer starting from the specified index
  private async fetchBatch(relayer: ZkBobRelayer, fromIndex: number, count: number): Promise<RawTxsBatch> {
    return relayer.fetchTransactionsOptimistic(BigInt(fromIndex), count).then( async txs => {      
      const txHashes: Record<number, string> = {};
      const indexedTxs: IndexedTx[] = [];
      const indexedTxsPending: IndexedTx[] = [];

      let maxMinedIndex = -1;
      let maxPendingIndex = -1;

      for (let txIdx = 0; txIdx < txs.length; ++txIdx) {
        const tx = txs[txIdx];
        const memo_idx = fromIndex + txIdx * OUTPLUSONE; // Get the first leaf index in the tree
        
        // tx structure from relayer: mined flag + txHash(32 bytes, 64 chars) + commitment(32 bytes, 64 chars) + memo
        const memo = tx.slice(129); // Skip mined flag, txHash and commitment
        const commitment = tx.slice(65, 129)

        const indexedTx: IndexedTx = {
          index: memo_idx,
          memo: memo,
          commitment: commitment,
        }

        // 3. Get txHash
        const txHash = tx.slice(1, 65);
        txHashes[memo_idx] = '0x' + txHash;

        // 4. Get mined flag
        if (tx.slice(0, 1) === '1') {
          indexedTxs.push(indexedTx);
          maxMinedIndex = Math.max(maxMinedIndex, memo_idx);
        } else {
          indexedTxsPending.push(indexedTx);
          maxPendingIndex = Math.max(maxPendingIndex, memo_idx);
        }
      }

      console.log(`🔥[HotSync] got batch of ${txs.length} transactions from index ${fromIndex}`);

      return {
        fromIndex: fromIndex,
        count: txs.length,
        minedTxs: indexedTxs,
        pendingTxs: indexedTxsPending,
        maxMinedIndex,
        maxPendingIndex,
        txHashes,
      }
    });
  }

  // The heaviest work: parse txs batch
  // and returns batch result
  private async parseBatch(batch: RawTxsBatch): Promise<BatchResult> {
    let hasOwnOptimisticTxs = false;

    const batchState = new Map<number, StateUpdate>();

    // process mined transactions 
    if (batch.minedTxs.length > 0) {
      const parseResult: ParseTxsResult = await this.worker.parseTxs(this.sk, batch.minedTxs);
      const decryptedMemos = parseResult.decryptedMemos;
      batchState.set(batch.fromIndex, parseResult.stateUpdate);
      //if (LOG_STATE_HOTSYNC) {
      //  this.logStateSync(i, i + txs.length * OUTPLUSONE, decryptedMemos);
      //}
      for (let decryptedMemoIndex = 0; decryptedMemoIndex < decryptedMemos.length; ++decryptedMemoIndex) {
        // save memos corresponding to the our account to restore history
        const myMemo = decryptedMemos[decryptedMemoIndex];
        myMemo.txHash = batch.txHashes[myMemo.index];
        this.history?.saveDecryptedMemo(myMemo, false);
      }
    }

    // process pending transactions from the optimisstic state
    if (batch.pendingTxs.length > 0) {
      const parseResult: ParseTxsResult = await this.worker.parseTxs(this.sk, batch.pendingTxs);
      const decryptedPendingMemos = parseResult.decryptedMemos;
      for (let idx = 0; idx < decryptedPendingMemos.length; ++idx) {
        // save memos corresponding to the our account to restore history
        const myMemo = decryptedPendingMemos[idx];
        myMemo.txHash = batch.txHashes[myMemo.index];
        this.history?.saveDecryptedMemo(myMemo, true);

        if (myMemo.acc != undefined) {
          // There is a pending transaction initiated by ourselfs
          // So we cannot create new transactions in that case
          hasOwnOptimisticTxs = true;
        }
      }
    }

    return {
      txCount: batch.count,
      maxMinedIndex: batch.maxMinedIndex,
      maxPendingIndex: batch.maxPendingIndex,
      hasOwnOptimisticTxs,
      state: batchState,
    };
  }

  // Just fetch and process the new state without local state updating
  // Return StateUpdate object
  // This method used for multi-tx
  public async getNewState(relayer: ZkBobRelayer, accBirthIndex: number): Promise<StateUpdate> {
    const startIndex = await this.getNextIndex();

    const stateInfo = await relayer.info();
    const optimisticIndex = BigInt(stateInfo.optimisticDeltaIndex);

    if (optimisticIndex > startIndex) {
      const startTime = Date.now();
      
      console.log(`⬇ Fetching transactions between ${startIndex} and ${optimisticIndex}...`);

      const numOfTx = Number((optimisticIndex - startIndex) / BigInt(OUTPLUSONE));
      const stateUpdate = relayer.fetchTransactionsOptimistic(startIndex, numOfTx).then( async txs => {
        console.log(`Getting ${txs.length} transactions from index ${startIndex}`);
        
        const indexedTxs: IndexedTx[] = [];

        for (let txIdx = 0; txIdx < txs.length; ++txIdx) {
          const tx = txs[txIdx];
          // Get the first leaf index in the tree
          const memo_idx = Number(startIndex) + txIdx * OUTPLUSONE;
          
          // tx structure from relayer: mined flag + txHash(32 bytes, 64 chars) + commitment(32 bytes, 64 chars) + memo
          // 1. Extract memo block
          const memo = tx.slice(129); // Skip mined flag, txHash and commitment

          // 2. Get transaction commitment
          const commitment = tx.slice(65, 129)
          
          const indexedTx: IndexedTx = {
            index: memo_idx,
            memo: memo,
            commitment: commitment,
          }

          // 3. add indexed tx
          indexedTxs.push(indexedTx);
        }

        const parseResult: ParseTxsResult = await this.worker.parseTxs(this.sk, indexedTxs);

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
    for (const decryptedMemo of decryptedMemos) {
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

  // returns false when the local state is inconsistent
  private async verifyState(getPoolRoot: (index: bigint) => Promise<bigint>): Promise<boolean> {
    const checkIndex = await this.getNextIndex();
    const localRoot = await this.getRoot();
    const poolRoot =  await getPoolRoot(checkIndex);

    if (localRoot == poolRoot) {
      await this.setLastVerifiedIndex(checkIndex);
      
      return true;
    }

    return false;
  }

  private isColdSyncAvailable(coldConfig?: ColdStorageConfig, fromIndex?: number, toIndex?: number): boolean {
    if (coldConfig) {
      const startRange = fromIndex ?? 0;
      const endRange = toIndex ?? (2 ** CONSTANTS.HEIGHT);
      const actualRangeStart = Math.max(startRange, Number(coldConfig.index_from));
      const actualRangeEnd = Math.min(endRange, Number(coldConfig.next_index));

      if (this.skipColdStorage == false &&
          (startRange % OUTPLUSONE) == 0 && 
          (endRange % OUTPLUSONE) == 0 &&
          isRangesIntersected(startRange, endRange, Number(coldConfig.index_from), Number(coldConfig.next_index)) &&
          ((actualRangeEnd - actualRangeStart) / OUTPLUSONE) >= COLD_STORAGE_USAGE_THRESHOLD
      ) {
        return true;
      }
    }

    return false;
  }

  private nextIndexAfterColdSync(coldConfig?: ColdStorageConfig, fromIndex?: number, toIndex?: number): number {
    if (this.isColdSyncAvailable(coldConfig, fromIndex, toIndex)) {
      return Math.min(toIndex ?? (2 ** CONSTANTS.HEIGHT), Number(coldConfig?.next_index));
    }

    return fromIndex ?? 0;
  }

  private async loadColdStorageTxs(
    getPoolRoot: (index: bigint) => Promise<bigint>,
    coldConfig?: ColdStorageConfig,
    coldStorageBaseAddr?: string,
    fromIndex?: number,
    toIndex?: number
  ): Promise<PartialSyncResult> {
    const startRange = fromIndex ?? 0;  // inclusively
    const endRange = toIndex ?? (2 ** CONSTANTS.HEIGHT);  // exclusively

    const syncResult: PartialSyncResult = {
      txCount: 0,
      decryptedLeafs: 0,
      firstIndex: startRange,
      nextIndex: startRange,
      totalTime: 0,
    };

    if (this.isColdSyncAvailable(coldConfig, fromIndex, toIndex)) {
      const actualRangeStart = Math.max(startRange, Number(coldConfig?.index_from));
      const actualRangeEnd = Math.min(endRange, Number(coldConfig?.next_index));

      const startTime = Date.now();

      // try get txs from the cold storage
      try {
        if (coldConfig && coldStorageBaseAddr) { 
          console.log(`🧊[ColdSync] loading txs up to index ${coldConfig.next_index}...`);
          const promises = coldConfig.bulks
            .filter(aBulk => {
              return isRangesIntersected(actualRangeStart, actualRangeEnd, Number(aBulk.index_from), Number(aBulk.next_index))
            })
            .map(async (bulkInfo) => {
              let response = await fetch(`${coldStorageBaseAddr}/${bulkInfo.filename}`);
              if (response.ok) {
                let aBulk = await response.arrayBuffer();
                if (aBulk.byteLength == bulkInfo.bytes) {
                  console.log(`🧊[ColdSync] got bulk ${bulkInfo.filename} with ${bulkInfo.tx_count} txs (${bulkInfo.bytes} bytes)`);

                  return new Uint8Array(aBulk);
                }

                //console.warn(`🧊[ColdSync] cannot load bulk ${bulkInfo.filename}: got ${aBulk.byteLength} bytes, expected ${bulkInfo.bytes} bytes`);
                //return new Uint8Array();
                throw new InternalError(`Cold storage corrupted (invalid file size: ${aBulk.byteLength})`)
              } else {
                //console.warn(`🧊[ColdSync] cannot load bulk ${bulkInfo.filename}: response code ${response.status} (${response.statusText})`);
                //return new Uint8Array();
                throw new InternalError(`Couldn't load cold storage (invalid response code: ${response.status})`)
              }
            });
          
          let bulksData = (await Promise.all(promises)).filter(data => data.length > 0);
          

          let result: ParseTxsColdStorageResult = await this.updateStateColdStorage(bulksData, BigInt(actualRangeStart), BigInt(actualRangeEnd));
          result.decryptedMemos.forEach((aMemo) => {
            this.history?.saveDecryptedMemo(aMemo, false);
          });


          syncResult.txCount = result.txCnt;
          syncResult.decryptedLeafs = result.decryptedLeafsCnt;
          syncResult.firstIndex = actualRangeStart;
          syncResult.nextIndex = actualRangeEnd;
          syncResult.totalTime = Date.now() - startTime;
          
          const isStateCorrect = await this.verifyState(getPoolRoot);
          if (!isStateCorrect) {
            console.warn(`🧊[ColdSync] Merkle tree root at index ${await this.getNextIndex()} mistmatch! Wiping the state...`);
            await this.clean();  // rollback to 0
            this.skipColdStorage = true;  // prevent cold storage usage

            syncResult.txCount = 0;
            syncResult.decryptedLeafs = 0;
            syncResult.firstIndex = 0;
            syncResult.nextIndex = 0;
          } else {
            console.log(`🧊[ColdSync] ${syncResult.txCount} txs have been loaded in ${syncResult.totalTime / 1000} secs (${syncResult.totalTime / syncResult.txCount} ms/tx)`);
            console.log(`🧊[ColdSync] Merkle root after tree update: ${await this.getRoot()} @ ${await this.getNextIndex()}`);
          }
        }
      } catch (err) {
        console.warn(`🧊[ColdSync] cannot sync with cold storage: ${err}`);
      }
    }

    return syncResult;
  }

  public syncStatistics(): SyncStat[] {
    return this.syncStats;
  }

  public async standbyState(): Promise<void> {
    if (this.updateStatePromise) {
      await this.updateStatePromise;
      this.updateStatePromise = undefined;
    }

    this.syncStats = [];
    this.skipColdStorage = false;
    this.rollbackAttempts = this.wipeAttempts = 0;
  }

  public async decryptMemos(tx: IndexedTx): Promise<ParseTxsResult> {
    return (await this.worker.parseTxs(this.sk, [tx])).decryptedMemos;
  }

  public async extractDecryptKeys(treeIndex: number, memoblock: Uint8Array): Promise<TxMemoChunk[]> {
    return this.worker.extractDecryptKeys(this.sk, BigInt(treeIndex), memoblock);
  }

  public async getTxInputs(treeIndex: number): Promise<TxInput | undefined> {
    return this.worker.getTxInputs(this.stateId, BigInt(treeIndex));
  }

  public async calcNullifier(treeIndex: number, acc: Account): Promise<string> {
    return this.worker.calcNullifier(this.stateId, acc, BigInt(treeIndex));
  }

  public async decryptAccount(symkey: Uint8Array, encrypted: Uint8Array): Promise<Account> {
    return this.worker.decryptAccount(symkey, encrypted);
  }

  public async decryptNote(symkey: Uint8Array, encrypted: Uint8Array): Promise<Note> {
    return this.worker.decryptNote(symkey, encrypted);
  }
}