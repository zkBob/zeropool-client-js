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

  let loaded = false;
  const worker: any = wrap(new Worker(workerPath));
  let initializer: Promise<void> = worker.initWasm(wasmPath, {
    txParams: snarkParams.transferParamsUrl,
    treeParams: snarkParams.treeParamsUrl,
  });

  
  initializer.then(() => {
    loaded = true
  });

  if (loadingCallback !== undefined) {
    // progress pseudo callback
    let lastLoadedBytes = -1;
    while (loaded == false) {
      const progress = await worker.getProgress();
      if (progress.total > 0 && progress.loaded != lastLoadedBytes) {
        loadingCallback(progress.loaded, progress.total);
        lastLoadedBytes = progress.loading;
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const progress = await worker.getProgress();
    loadingCallback(progress.loaded, progress.total);
  }

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
