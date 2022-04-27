import { wrap } from 'comlink';
import { Params, default as initWasm } from 'libzeropool-rs-wasm-web';

import { SnarkConfigParams, SnarkParams } from './config';
import { FileCache } from './file-cache';

export { ZeropoolClient } from './client';

export { HistoryRecord, HistoryTransactionType } from './history'

export class ZeroPoolLibState {
  public fileCache: FileCache;
  public worker: any;
  public snarkParams: SnarkParams;
}

export async function init(wasmPath: string, workerPath: string, snarkParams: SnarkConfigParams): Promise<ZeroPoolLibState> {
  const fileCache = await FileCache.init();

  const worker: any = wrap(new Worker(workerPath));
  await worker.initWasm(wasmPath, {
    txParams: snarkParams.transferParamsUrl,
    treeParams: snarkParams.treeParamsUrl,
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
