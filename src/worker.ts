import { expose } from 'comlink';
import { IndexedTx, ParseTxsResult, ParseTxsColdStorageResult, StateUpdate, SnarkProof, TreeNode,
          ITransferData, IDepositData, IWithdrawData, IDepositPermittableData
        } from 'libzkbob-rs-wasm-web';
import { FileCache } from './file-cache';
import { threads } from 'wasm-feature-detect';

let txParams: Promise<any>;
let treeParams: any;
let txParser: any;
let zpAccounts: { [tokenAddress: string]: any } = {};
let transferVk: any;
let treeVk: any;

let wasm: any;

const obj = {
  async initWasm(
    paramUrls: { txParams: string; treeParams: string },
    txParamsHash: string | undefined = undefined,  // skip hash checking when undefined
    vkUrls: {transferVkUrl: string, treeVkUrl: string},
  ) {
    console.info('Initializing web worker...');
    
    // Safari doesn't support spawning Workers from inside other Workers yet.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMt = await threads() && !isSafari;
    
    if (isMt) {
      console.log('Using multi-threaded version');
      wasm = await import('libzkbob-rs-wasm-web-mt');
      await wasm.default();
      await wasm.initThreadPool(navigator.hardwareConcurrency);
    } else {
      console.log('Using single-threaded version. Proof generation will be significantly slower.');
      wasm = await import('libzkbob-rs-wasm-web');
      await wasm.default()
    }

    txParams = this.getTxParams(paramUrls.txParams, txParamsHash);

    txParser = wasm.TxParser._new()

    console.time(`VK initializing`);
    transferVk = await (await fetch(vkUrls.transferVkUrl)).json();
    treeVk = await (await fetch(vkUrls.treeVkUrl)).json();
    console.timeEnd(`VK initializing`);

    console.info('Web worker init complete.');
  },

  async getTxParams(txParamsUrl: string, txParamsHash: string | undefined): Promise<any> {
    return new Promise(async resolve => {
      const cache = await FileCache.init();

      console.time(`[Background] Load parameters from DB`);
      let txParamsData = await cache.get(txParamsUrl);
      console.timeEnd(`[Background] Load parameters from DB`);

      // check parameters hash if needed
      if (txParamsData && txParamsHash !== undefined) {
        let computedHash = await cache.getHash(txParamsUrl);
        if (!computedHash) {
          computedHash = await cache.saveHash(txParamsUrl, txParamsData);
        }
        
        if (computedHash.toLowerCase() != txParamsHash.toLowerCase()) {
          // forget saved params in case of hash inconsistence
          console.warn(`[Background] Hash of cached tx params (${computedHash}) doesn't associated with provided (${txParamsHash}).`);
          cache.remove(txParamsUrl);
          txParamsData = null;
        }
      }

      let txParams;
      if (!txParamsData) {
        console.time(`[Background] Download params`);
        txParamsData = await cache.cache(txParamsUrl);
        console.timeEnd(`[Background] Download params`);

        console.time(`[Background] Creating Params object`);
        txParams = wasm.Params.fromBinary(new Uint8Array(txParamsData!));
        console.timeEnd(`[Background] Creating Params object`);

      } else {
        console.log(`[Background] File ${txParamsUrl} is present in cache, no need to fetch`);
        console.time(`[Background] Creating Params object`);
        txParams = wasm.Params.fromBinaryExtended(new Uint8Array(txParamsData!), false, false);
        console.timeEnd(`[Background] Creating Params object`);
      }
      resolve(txParams);
    });
  },

  async proveTx(pub, sec) {
    return new Promise(async resolve => {
      console.debug('Web worker: proveTx');
      const result = wasm.Proof.tx(await txParams, pub, sec);
      resolve(result);
    });
  },

  async proveTree(pub, sec) {
    return new Promise(async resolve => {
      console.debug('Web worker: proveTree');
      const result = wasm.Proof.tree(treeParams, pub, sec);
      resolve(result);
    });
  },

  async parseTxs(sk: Uint8Array, txs: IndexedTx[]): Promise<ParseTxsResult> {
    return new Promise(async resolve => {
      console.debug('Web worker: parseTxs');
      const result = txParser.parseTxs(sk, txs)
      sk.fill(0)
      resolve(result);
    });
  },

  async createAccount(address: string, sk: Uint8Array, networkName: string, userId: string): Promise<void> {
    return new Promise(async resolve => {
      console.debug('Web worker: createAccount');
      try {
        const state = await wasm.UserState.init(`zp.${networkName}.${userId}`);
        const acc = new wasm.UserAccount(sk, state);
        zpAccounts[address] = acc;
      } catch (e) {
        console.error(e);
      }
      resolve();
    });
  },

  async totalBalance(address: string): Promise<string> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].totalBalance());
    });
  },

  async accountBalance(address: string): Promise<string> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].accountBalance());
    });
  },

  async noteBalance(address: string): Promise<string> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].noteBalance());
    });
  },

  async usableNotes(address: string): Promise<any[]> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].getUsableNotes());
    });
  },

  async isOwnAddress(address: string, shieldedAddress: string): Promise<boolean> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].isOwnAddress(shieldedAddress));
    });
  },

  async rawState(address: string): Promise<any> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].getWholeState());
    });
  },

  async free(address: string): Promise<void> {
    return new Promise(async resolve => {
      zpAccounts[address].free();
      resolve();
    });
  },

  async generateAddress(address: string): Promise<string> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].generateAddress());
    });
  },

  async createDepositPermittable(address: string, deposit: IDepositPermittableData): Promise<any> {
    return await zpAccounts[address].createDepositPermittable(deposit);
  },

  async createTransferOptimistic(address: string, tx: ITransferData, optimisticState: any): Promise<any> {
    return await zpAccounts[address].createTransferOptimistic(tx, optimisticState);
  },

  async createWithdrawalOptimistic(address: string, tx: IWithdrawData, optimisticState: any): Promise<any> {
    return await zpAccounts[address].createWithdrawalOptimistic(tx, optimisticState);
  },

  async createDeposit(address: string, deposit: IDepositData): Promise<any> {
    return await zpAccounts[address].createDeposit(deposit);
  },

  async createTransfer(address: string, transfer: ITransferData): Promise<any> {
    return await zpAccounts[address].createTransfer(transfer);
  },

  async nextTreeIndex(address: string): Promise<bigint> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].nextTreeIndex());
    });
  },

  async firstTreeIndex(address: string): Promise<bigint | undefined> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].firstTreeIndex());
    });
  },

  async getRoot(address: string): Promise<string> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].getRoot());
    });
  },

  async getRootAt(address: string, index: bigint): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(zpAccounts[address].getRootAt(index));
      } catch (e) {
        reject(e)
      }
    });
  },

  async getLeftSiblings(address: string, index: bigint): Promise<TreeNode[]> {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(zpAccounts[address].getLeftSiblings(index));
      } catch (e) {
        reject(e)
      }
    });
  },

  async rollbackState(address: string, index: bigint): Promise<bigint> {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(zpAccounts[address].rollbackState(index));
      } catch (e) {
        reject(e)
      }
    });
  },

  async wipeState(address: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(zpAccounts[address].wipeState());
      } catch (e) {
        reject(e)
      }
    });
  },

  async getTreeLastStableIndex(address: string): Promise<bigint> {
    return new Promise(async (resolve) => {
      resolve(zpAccounts[address].treeGetStableIndex());
    });
  },

  async setTreeLastStableIndex(address: string, index: bigint): Promise<void> {
    return new Promise(async (resolve) => {
      resolve(zpAccounts[address].treeSetStableIndex(index));
    });
  },

  async updateState(address: string, stateUpdate: StateUpdate, siblings?: TreeNode[]): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        let result = zpAccounts[address].updateState(stateUpdate, siblings);
        resolve(result)
      } catch (e) {
        reject(e)
      }
    });
  },

  async updateStateColdStorage(address: string, bulks: Uint8Array[], indexFrom?: bigint, indexTo?: bigint): Promise<ParseTxsColdStorageResult> {
    return new Promise(async (resolve, reject) => {
      console.debug('Web worker: updateStateColdStorage');
      try {
        let result = zpAccounts[address].updateStateColdStorage(bulks, indexFrom, indexTo);
        resolve(result);
      } catch (e) {
        reject(e)
      }
    });
  },

  async verifyTxProof(inputs: string[], proof: SnarkProof): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      try {
        resolve(wasm.Proof.verify(transferVk!, inputs, proof));
      } catch (e) {
        reject(e)
      }
    });
  },

  async verifyTreeProof(inputs: string[], proof: SnarkProof): Promise<boolean> {
    return new Promise(async resolve => {
      resolve(wasm.Proof.verify(treeVk!, inputs, proof));
    });
  },

  async verifyShieldedAddress(shieldedAddress: string): Promise<boolean> {
    return new Promise(async resolve => {
      resolve(wasm.validateAddress(shieldedAddress));
    });
  },

  async assembleAddress(d: string, p_d: string): Promise<string> {
    return new Promise(async resolve => {
      resolve(wasm.assembleAddress(d, p_d));
    });
  }
};

expose(obj);
