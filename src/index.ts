import { wrap } from 'comlink';
import { Params, default as initWasm } from 'libzkbob-rs-wasm-web';

import { SnarkConfigParams, SnarkParams } from './config';
import { FileCache } from './file-cache';
import { LoadingProgressCallback } from './file-cache';

export { ZkBobClient, TxAmount, FeeAmount, PoolLimits } from './client';

export { TxType } from './tx';

export { HistoryRecord, HistoryTransactionType } from './history'

export class ZkBobLibState {
  public fileCache: FileCache;
  public worker: any;
  public snarkParams: SnarkParams;
}

export async function init(
  wasmPath: string,
  workerPath: string,
  snarkParams: SnarkConfigParams,
  loadingCallback: LoadingProgressCallback | undefined = undefined 
): Promise<ZkBobLibState> {
  const fileCache = await FileCache.init();

  const worker: any = wrap(new Worker(workerPath));
  await worker.initWasm(wasmPath, {
    txParams: snarkParams.transferParamsUrl,
    treeParams: snarkParams.treeParamsUrl,
    loadingCallback
  });

  await initWasm(wasmPath);
  const transferVk = await (await fetch(snarkParams.transferVkUrl)).json();
  const treeVk = await (await fetch(snarkParams.treeVkUrl)).json();

  return {
    fileCache,
    worker,
    snarkParams: {
      transferVk,
      treeVk,
    }
  };
}
