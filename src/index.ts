import { wrap } from 'comlink';
import { SnarkConfigParams } from './config';
import { FileCache } from './file-cache';
export { TreeNode } from 'libzkbob-rs-wasm-web';
export { ZkBobClient, TransferConfig, FeeAmount, PoolLimits, TreeState, SyncStat, ServiceVersion } from './client';
export { TxType } from './tx';
export { HistoryRecord, HistoryTransactionType, HistoryRecordState, ComplianceHistoryRecord } from './history'
export { EphemeralAddress, EphemeralPool } from './ephemeral'
export * from './errors'

const LIB_VERSION = require('../package.json').version;

export enum InitState {
  Started = 1,
  InitWorker,
  Completed,
  Failed,
}

export interface InitStatus {
  state: InitState;
  error?: Error | undefined;
}

export type InitLibCallback = (status: InitStatus) => void;

export class ZkBobLibState {
  public fileCache: FileCache;
  public worker: any;
}

async function fetchTxParamsHash(relayerUrl: string): Promise<string> {
  const url = new URL('/params/hash/tx', relayerUrl);
  const headers = {'content-type': 'application/json;charset=UTF-8',
                   'zkbob-libjs-version': LIB_VERSION};
  const res = await fetch(url.toString(), {headers});

  return (await res.json()).hash;
}

export async function init(
  snarkParams: SnarkConfigParams,
  relayerURL: string | undefined = undefined, // we'll try to fetch parameters hash for verification
  statusCallback: InitLibCallback | undefined = undefined,
  forcedMultithreading: boolean | undefined = undefined, // specify this parameter to override multithreading autoselection
): Promise<ZkBobLibState> {
  const fileCache = await FileCache.init();

  if (statusCallback !== undefined) {
    statusCallback({ state: InitState.Started });
  }

  // Get tx parameters hash from the relayer
  // to check local params consistence
  let txParamsHash: string | undefined = undefined;
  if (relayerURL !== undefined) {
    try {
      txParamsHash = await fetchTxParamsHash(relayerURL);
    } catch (err) {
      console.warn(`Cannot fetch tx parameters hash from the relayer (${err.message})`);
    }
  }

  let worker: any;

  // Intercept all possible exceptions to process `Failed` status
  try {
    if (statusCallback !== undefined) {
      statusCallback({ state: InitState.InitWorker });
    }

    worker = wrap(new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }));
    await worker.initWasm({
      txParams: snarkParams.transferParamsUrl,
      treeParams: snarkParams.treeParamsUrl,
    }, txParamsHash, 
    {
      transferVkUrl: snarkParams.transferVkUrl,
      treeVkUrl: snarkParams.treeVkUrl,
    },
    forcedMultithreading);

    if (statusCallback !== undefined) {
      statusCallback({ state: InitState.Completed });
    }
  } catch(err) {
    console.error(`Cannot initialize client library: ${err.message}`);
    if (statusCallback !== undefined) {
      statusCallback({ state: InitState.Failed, error: err });
    }
  }

  return {
    fileCache,
    worker,
  };
}
