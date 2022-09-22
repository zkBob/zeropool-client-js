import { expose } from 'comlink';
import { Proof, Params, TxParser, IndexedTx, ParseTxsResult, default as init, initThreadPool } from 'libzkbob-rs-wasm-web';
import { FileCache, LoadingProgressCallback } from './file-cache';

let txParams: Params;
let treeParams: Params;
let txParser: TxParser;

enum LoadingStage {
  Unknown = 0,
  Init = 1,
  Download,
  CheckingHash,
  LoadObjects,
  Completed,
}

let loadingStage: LoadingStage = LoadingStage.Unknown;
let loadedBytes: number = 0;
let totalBytes: number = 0;

const obj = {
  async initWasm(
    url: string,
    paramUrls: { txParams: string; treeParams: string }
  ) {
    loadingStage = LoadingStage.Init;
    console.info('Initializing web worker...');
    await init(url);
    await initThreadPool(navigator.hardwareConcurrency);

    const cache = await FileCache.init();

    loadedBytes = 0;
    totalBytes = 0;

    let txParamsData = await cache.get(paramUrls.txParams);
    if (!txParamsData) {
      console.log(`Caching ${paramUrls.txParams}`)
      txParamsData = await cache.cache(paramUrls.txParams, (loaded, total) => {
        loadedBytes = loaded;
        totalBytes = total;
      });
      console.log(`Parameter file returned`);
      txParams = Params.fromBinary(new Uint8Array(txParamsData!));
      console.log(`Parameter object created`);
    } else {
      loadedBytes = txParamsData.byteLength;
      totalBytes = txParamsData.byteLength;

      console.log(`File ${paramUrls.txParams} is present in cache, no need to fetch`);
      txParams = Params.fromBinaryExtended(new Uint8Array(txParamsData!), false, false);
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
  },

  getProgress() {
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
