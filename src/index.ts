export { TreeNode } from 'libzkbob-rs-wasm-web';
export { ZkBobAccountlessClient, PoolLimits, TreeState } from './client-base';
export { ZkBobClient, TransferConfig, TransferRequest, FeeAmount, SyncStat } from './client';
export { TxType } from './tx';
export { HistoryRecord, HistoryTransactionType, HistoryRecordState } from './history'
export { EphemeralAddress, EphemeralPool } from './ephemeral'
export { ServiceType, ServiceVersion } from './services/common'
export * from './errors'

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