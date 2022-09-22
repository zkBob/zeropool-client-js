import { wrap } from 'comlink';
import { Params, default as initWasm } from 'libzkbob-rs-wasm-web';

import { SnarkConfigParams, SnarkParams } from './config';
import { FileCache } from './file-cache';
import { LoadingProgressCallback } from './file-cache';

export { ZkBobClient, TxAmount, FeeAmount, PoolLimits } from './client';

export { TxType } from './tx';

export { HistoryRecord, HistoryTransactionType } from './history'


export enum InitState {
  Started = 1,
  DownloadingParams,
  InitWorker,
  InitWasm,
  Completed,
  Failed,
}

export interface InitStatus {
  state: InitState;
  download: {loaded: number, total: number};  // bytes
  error?: Error | undefined;
}

export type InitLibCallback = (status: InitStatus) => void;

export class ZkBobLibState {
  public fileCache: FileCache;
  public worker: any;
  public snarkParams: SnarkParams;
}

export async function init(
  wasmPath: string,
  workerPath: string,
  snarkParams: SnarkConfigParams,
  statusCallback: InitLibCallback | undefined = undefined 
): Promise<ZkBobLibState> {
  const fileCache = await FileCache.init();

  let lastProgress = {loaded: -1, total: -1};

  if (statusCallback !== undefined) {
    // Start initialization event
    statusCallback({ state: InitState.Started, download: lastProgress });
  }

  let loaded = false;
  const worker: any = wrap(new Worker(workerPath));
  let initializer: Promise<void> = worker.initWasm(wasmPath, {
    txParams: snarkParams.transferParamsUrl,
    treeParams: snarkParams.treeParamsUrl,
  });

  
  initializer.then(() => {
    loaded = true
  });

  if (statusCallback !== undefined) {
    // progress pseudo callback
    while (loaded == false) {
      const progress = await worker.getProgress();
      if (progress.total > 0 && progress.loaded != lastProgress.loaded) {
        lastProgress = progress;
        statusCallback({ state: InitState.DownloadingParams, download: lastProgress });
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    lastProgress = await worker.getProgress();
    statusCallback({ state: InitState.DownloadingParams, download: lastProgress });
  }

  console.log(`Wasm engine initializing`);
  await initWasm(wasmPath);
  console.log(`Download verification keys`);
  const transferVk = await (await fetch(snarkParams.transferVkUrl)).json();
  const treeVk = await (await fetch(snarkParams.treeVkUrl)).json();
  console.log(`Finishing library initialization`);

  return {
    fileCache,
    worker,
    snarkParams: {
      transferVk,
      treeVk,
    }
  };
}
