import { IDepositData, IDepositPermittableData, ITransferData, IWithdrawData,
          ParseTxsResult, ParseTxsColdStorageResult, StateUpdate,
          DecryptedMemo, IndexedTx, TreeNode,
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
  state: Map<number, StateUpdate>;  // key: first tx index, 
                                    // value: StateUpdate object (notes, accounts, leafs and comminments)
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

  // Create regular state with the provided spending key
  // and other parameters
  public static async create(
    sk: Uint8Array,
    birthIndex: number | undefined,
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

    await worker.createAccount(zpState.stateId, zpState.sk, poolId, networkName);
    zpState.worker = worker;
    
    zpState.history = await HistoryStorage.init(zpState.stateId, rpcUrl, zpState);

    let network = networkName as NetworkType;
    zpState.ephemeralAddrPool = await EphemeralPool.init(zpState.sk, tokenAddress, network, rpcUrl, denominator);

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
    let startIndex = Number(await this.getNextIndex());

    const stateInfo = await relayer.info();
    const nextIndex = Number(stateInfo.deltaIndex);
    const optimisticIndex = Number(stateInfo.optimisticDeltaIndex);

    let readyToTransact = true;

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

      // Try to using the cold storage
      const coldResult = await this.loadColdStorageTxs(getPoolRoot, coldConfig, coldBaseAddr, startIndex);

      const curStat: SyncStat = {
        txCount: (optimisticIndex - startIndex) / OUTPLUSONE,
        cdnTxCnt: coldResult.txCount,
        decryptedLeafs: coldResult.decryptedLeafs,
        fullSync: startIndex == 0 ? true : false,
        totalTime: coldResult.totalTime,
        timePerTx: 0,
      };

      // change hot sync position
      startIndex = coldResult.nextIndex;
      console.log(`🔥[HotSync] fetching transactions between ${startIndex} and ${optimisticIndex}...`);
      const startTime = Date.now();

      const batches: Promise<BatchResult>[] = [];
      for (let i = startIndex; i <= optimisticIndex; i = i + BATCH_SIZE * OUTPLUSONE) {
        const oneBatch = relayer.fetchTransactionsOptimistic(BigInt(i), BATCH_SIZE).then( async txs => {
          console.log(`🔥[HotSync] got ${txs.length} transactions from index ${i}`);

          const batchState = new Map<number, StateUpdate>();
          
          const txHashes: Record<number, string> = {};
          const indexedTxs: IndexedTx[] = [];

          const txHashesPending: Record<number, string> = {};
          const indexedTxsPending: IndexedTx[] = [];

          let maxMinedIndex = -1;
          let maxPendingIndex = -1;

          for (let txIdx = 0; txIdx < txs.length; ++txIdx) {
            const tx = txs[txIdx];
            const memo_idx = i + txIdx * OUTPLUSONE; // Get the first leaf index in the tree
            
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

            // 4. Get mined flag
            if (tx.slice(0, 1) === '1') {
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
            const parseResult: ParseTxsResult = await this.worker.parseTxs(this.sk, indexedTxs);
            const decryptedMemos = parseResult.decryptedMemos;
            batchState.set(i, parseResult.stateUpdate);
            if (LOG_STATE_HOTSYNC) {
              this.logStateSync(i, i + txs.length * OUTPLUSONE, decryptedMemos);
            }
            for (let decryptedMemoIndex = 0; decryptedMemoIndex < decryptedMemos.length; ++decryptedMemoIndex) {
              // save memos corresponding to the our account to restore history
              const myMemo = decryptedMemos[decryptedMemoIndex];
              myMemo.txHash = txHashes[myMemo.index];
              this.history?.saveDecryptedMemo(myMemo, false);
            }
          }

          if (indexedTxsPending.length > 0) {
            const parseResult: ParseTxsResult = await this.worker.parseTxs(this.sk, indexedTxsPending);
            const decryptedPendingMemos = parseResult.decryptedMemos;
            for (let idx = 0; idx < decryptedPendingMemos.length; ++idx) {
              // save memos corresponding to the our account to restore history
              const myMemo = decryptedPendingMemos[idx];
              myMemo.txHash = txHashesPending[myMemo.index];
              this.history?.saveDecryptedMemo(myMemo, true);

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

      const totalState = new Map<number, StateUpdate>();
      const initRes: BatchResult = {txCount: 0, maxMinedIndex: -1, maxPendingIndex: -1, state: totalState};
      const totalRes = (await Promise.all(batches)).reduce((acc, cur) => {
        return {
          txCount: acc.txCount + cur.txCount,
          maxMinedIndex: Math.max(acc.maxMinedIndex, cur.maxMinedIndex),
          maxPendingIndex: Math.max(acc.maxPendingIndex, cur.maxPendingIndex),
          state: new Map([...Array.from(acc.state.entries()), ...Array.from(cur.state.entries())]),
        }
      }, initRes);

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

      // remove unneeded pending records
      this.history?.setLastMinedTxIndex(totalRes.maxMinedIndex);
      this.history?.setLastPendingTxIndex(totalRes.maxPendingIndex);


      const hotSyncTime = Date.now() - startTime;
      const hotSyncTimePerTx = hotSyncTime / totalRes.txCount;

      curStat.txCount = totalRes.txCount + coldResult.txCount;
      curStat.cdnTxCnt = coldResult.txCount;
      curStat.totalTime = hotSyncTime + coldResult.totalTime;
      curStat.timePerTx = curStat.totalTime / curStat.txCount;

      // save relevant stats only
      if (curStat.txCount >= MIN_TX_COUNT_FOR_STAT) {
        this.syncStats.push(curStat);
      }


      console.log(`🔥[HotSync] finished in ${hotSyncTime / 1000} sec | ${totalRes.txCount} tx, avg speed ${hotSyncTimePerTx.toFixed(1)} ms/tx`);
      if (coldResult.txCount > 0) {
        console.log(`🧊🔥[TotalSync] finished in ${curStat.totalTime / 1000} sec | ${curStat.txCount} tx, avg speed ${curStat.timePerTx.toFixed(1)} ms/tx`);
      }
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

    return readyToTransact;
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

    if (coldConfig) {
      const actualRangeStart = Math.max(startRange, Number(coldConfig.index_from));
      const actualRangeEnd = Math.min(endRange, Number(coldConfig.next_index));

      if (this.skipColdStorage == false &&
          (startRange % OUTPLUSONE) == 0 && 
          (endRange % OUTPLUSONE) == 0 &&
          isRangesIntersected(startRange, endRange, Number(coldConfig.index_from), Number(coldConfig.next_index)) &&
          ((actualRangeEnd - actualRangeStart) / OUTPLUSONE) >= COLD_STORAGE_USAGE_THRESHOLD
      ) {
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
}