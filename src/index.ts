import { wrap } from 'comlink';
import { Params, default as initWasm } from 'libzkbob-rs-wasm-web';
import { SnarkConfigParams, SnarkParams } from './config';
import { FileCache } from './file-cache';
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

async function fetchTxParamsHash(relayerUrl: string): Promise<string> {
  const url = new URL('/params/hash/tx', relayerUrl);
  const headers = {'content-type': 'application/json;charset=UTF-8'};
  const res = await fetch(url.toString(), {headers});

  return (await res.json()).hash;
}

export async function init(
  wasmPath: string,
  workerPath: string,
  snarkParams: SnarkConfigParams,
  relayerURL: string | undefined = undefined,
  statusCallback: InitLibCallback | undefined = undefined 
): Promise<ZkBobLibState> {
  const fileCache = await FileCache.init();

  let lastProgress = {loaded: -1, total: -1};

  if (statusCallback !== undefined) {
    statusCallback({ state: InitState.Started, download: lastProgress });
  }

  let txParamsHash: string | undefined = undefined;
  if (relayerURL !== undefined) {
    try {
      txParamsHash = await fetchTxParamsHash(relayerURL);
    } catch (err) {
      console.warn(`Cannot fetch tx parameters hash from the relayer (${err.message})`);
    }
  }

  let loaded = false;
  const worker: any = wrap(new Worker(workerPath));
  let initializer: Promise<void> = worker.initWasm(wasmPath, {
    txParams: snarkParams.transferParamsUrl,
    treeParams: snarkParams.treeParamsUrl,
  }, txParamsHash);

  
  initializer.then(() => {
    loaded = true
  });

  if (statusCallback !== undefined) {
    // progress pseudo callback
    while (loaded == false) {
      const progress = await worker.getProgress();
      const stage = await worker.getLoadingStage();
      switch(stage) {
        case 4: //LoadingStage.Download: // we cannot import LoadingStage in runtime
          if (progress.total > 0 && progress.loaded != lastProgress.loaded) {
            lastProgress = progress;
            statusCallback({ state: InitState.DownloadingParams, download: lastProgress });
          }
          break;

        case 5: //LoadingStage.LoadObjects: // we cannot import LoadingStage in runtime
          lastProgress = progress;
          statusCallback({ state: InitState.InitWorker, download: lastProgress });
          break;

        default: break;
      }

      await new Promise(resolve => setTimeout(resolve, 10));
    }

    lastProgress = await worker.getProgress();
    statusCallback({ state: InitState.InitWasm, download: lastProgress });
  }

  console.time(`Wasm engine initializing`);
  await initWasm(wasmPath);
  console.timeEnd(`Wasm engine initializing`);

  console.time(`Load VKs`);
  const transferVk = await (await fetch(snarkParams.transferVkUrl)).json();
  const treeVk = await (await fetch(snarkParams.treeVkUrl)).json();
  console.timeEnd(`Load VKs`);

  if (statusCallback !== undefined) {
    statusCallback({ state: InitState.Completed, download: lastProgress });
  }

  return {
    fileCache,
    worker,
    snarkParams: {
      transferVk,
      treeVk,
    }
  };
}
