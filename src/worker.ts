import { expose } from 'comlink';
import { Proof, Params, TxParser, IndexedTx, ParseTxsResult, default as init, initThreadPool } from 'libzkbob-rs-wasm-web';
import { FileCache, LoadingProgressCallback } from './file-cache';
import sha256 from 'fast-sha256';

let txParams: Params;
let treeParams: Params;
let txParser: TxParser;

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
    txParamsHash: string | undefined = undefined  // skip hash checking when undefined
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

      console.time(`Creating Params object`);
      txParams = Params.fromBinary(new Uint8Array(txParamsData!));
      console.timeEnd(`Creating Params object`);
    } else {
      loadingStage = LoadingStage.LoadObjects;

      loadedBytes = txParamsData.byteLength;
      totalBytes = txParamsData.byteLength;

      console.log(`File ${paramUrls.txParams} is present in cache, no need to fetch`);

      console.time(`Creating Params object`);
      txParams = Params.fromBinaryExtended(new Uint8Array(txParamsData!), false, false);
      console.timeEnd(`Creating Params object`);
    }

    /*let treeParamsData = await cache.get(paramUrls.treeParams);
    if (!treeParamsData) {
      console.log(`Caching ${paramUrls.treeParams}`)
      treeParamsData = await cache.cache(paramUrls.treeParams, loadingCallback);
      treeParams = Params.fromBinary(new Uint8Array(treeParamsData!));
    } else {
      console.log(`File ${paramUrls.treeParams} is present in cache, no need to fetch`);
      treeParams = Params.fromBinaryExtended(new Uint8Array(treeParamsData!), false, false);
    }*/

    txParser = TxParser._new()
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
};

expose(obj);
