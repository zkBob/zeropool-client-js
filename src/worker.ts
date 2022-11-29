import { expose } from 'comlink';
import { Proof, Params, TxParser, IndexedTx, ParseTxsResult, default as init, initThreadPool, UserState, UserAccount, StateUpdate, validateAddress, assembleAddress, SnarkProof, ITransferData, IDepositData, IWithdrawData, IDepositPermittableData, DecryptedMemo } from 'libzkbob-rs-wasm-web';
import { FileCache } from './file-cache';

let txParams: Params;
let treeParams: Params;
let txParser: TxParser;
let zpAccounts: { [tokenAddress: string]: UserAccount } = {};
let transferVk: any;
let treeVk: any;

// NOTE: Please fix enum constants in index.ts
// in case of you change this enum
export enum LoadingStage {
  Unknown = 0,
  Init = 1, // initWasm routine has been started
  DatabaseRead, // parameters loaded from DB
  CheckingHash, // TODO: verify hash of the stored parameters
  Download, // parameters has been started loading
  LoadObjects,  // load parameters in the memory
  Completed,  // initialization completed
}

let loadingStage: LoadingStage = LoadingStage.Unknown;
let loadedBytes: number = 0;
let totalBytes: number = 0;

const obj = {
  async initWasm(
    url: string,
    paramUrls: { txParams: string; treeParams: string },
    txParamsHash: string | undefined = undefined,  // skip hash checking when undefined
    vkUrls: {transferVkUrl: string, treeVkUrl: string},
  ) {
    loadingStage = LoadingStage.Init;
    console.info('Initializing web worker...');
    await init(url);
    await initThreadPool(navigator.hardwareConcurrency);

    const cache = await FileCache.init();

    loadedBytes = 0;
    totalBytes = 0;

    loadingStage = LoadingStage.DatabaseRead;
    console.time(`Load parameters from DB`);
    let txParamsData = await cache.get(paramUrls.txParams);
    console.timeEnd(`Load parameters from DB`);

    // check parameters hash if needed
    if (txParamsData && txParamsHash !== undefined) {
      loadingStage = LoadingStage.CheckingHash;

      let computedHash = await cache.getHash(paramUrls.txParams);
      if (!computedHash) {
        computedHash = await cache.saveHash(paramUrls.txParams, txParamsData);
      }
      
      if (computedHash.toLowerCase() != txParamsHash.toLowerCase()) {
        // forget saved params in case of hash inconsistence
        console.warn(`Hash of cached tx params (${computedHash}) doesn't associated with provided (${txParamsHash}). Reload needed!`);
        cache.remove(paramUrls.txParams);
        txParamsData = null;
      }
    }

    if (!txParamsData) {
      loadingStage = LoadingStage.Download;
      console.time(`Download params`);
      txParamsData = await cache.cache(paramUrls.txParams, (loaded, total) => {
        loadedBytes = loaded;
        totalBytes = total;
      });
      console.timeEnd(`Download params`);

      loadingStage = LoadingStage.LoadObjects;
      await new Promise(resolve => setTimeout(resolve, 20)); // workaround to proper stage updating
      console.time(`Creating Params object`);
      txParams = Params.fromBinary(new Uint8Array(txParamsData!));
      console.timeEnd(`Creating Params object`);

    } else {
      loadedBytes = txParamsData.byteLength;
      totalBytes = txParamsData.byteLength;

      console.log(`File ${paramUrls.txParams} is present in cache, no need to fetch`);

      loadingStage = LoadingStage.LoadObjects;
      await new Promise(resolve => setTimeout(resolve, 20)); // workaround to proper stage updating
      console.time(`Creating Params object`);
      txParams = Params.fromBinaryExtended(new Uint8Array(txParamsData!), false, false);
      console.timeEnd(`Creating Params object`);
    }

    txParser = TxParser._new()

    console.time(`VK initializing`);
    transferVk = await (await fetch(vkUrls.transferVkUrl)).json();
    treeVk = await (await fetch(vkUrls.treeVkUrl)).json();
    console.timeEnd(`VK initializing`);

    console.info('Web worker init complete.');

    loadingStage = LoadingStage.Completed;
  },

  getLoadingStage(): LoadingStage {
    return loadingStage;
  },

  getProgress(): {loaded: number, total: number} {
    return {loaded: loadedBytes, total: totalBytes};
  },

  async proveTx(pub, sec) {
    return new Promise(async resolve => {
      console.debug('Web worker: proveTx');
      const result = Proof.tx(txParams, pub, sec);
      resolve(result);
    });
  },

  async proveTree(pub, sec) {
    return new Promise(async resolve => {
      console.debug('Web worker: proveTree');
      const result = Proof.tree(treeParams, pub, sec);
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
        const state = await UserState.init(`zp.${networkName}.${userId}`);
        const acc = new UserAccount(sk, state);
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

  async getRoot(address: string): Promise<string> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].getRoot());
    });
  },

  async updateState(address: string, stateUpdate: StateUpdate): Promise<void> {
    return new Promise(async resolve => {
      resolve(zpAccounts[address].updateState(stateUpdate));
    });
  },

  async updateStateColdStorage(address: string, bulks: Uint8Array[]): Promise<DecryptedMemo[]> {
    return new Promise(async resolve => {
      let result = zpAccounts[address].updateStateColdStorage(bulks);
      resolve(result);
    });
  },

  async verifyTxProof(inputs: string[], proof: SnarkProof): Promise<boolean> {
    return new Promise(async resolve => {
      resolve(Proof.verify(transferVk!, inputs, proof));
    });
  },

  async verifyTreeProof(inputs: string[], proof: SnarkProof): Promise<boolean> {
    return new Promise(async resolve => {
      resolve(Proof.verify(treeVk!, inputs, proof));
    });
  },

  async verifyShieldedAddress(shieldedAddress: string): Promise<boolean> {
    return new Promise(async resolve => {
      resolve(validateAddress(shieldedAddress));
    });
  },

  async assembleAddress(d: string, p_d: string): Promise<string> {
    return new Promise(async resolve => {
      resolve(assembleAddress(d, p_d));
    });
  }
};

expose(obj);
