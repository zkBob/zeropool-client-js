export interface Config {
  snarkParams: SnarkConfigParams;
  wasmPath: string;
  workerPath: string;
}

export interface SnarkConfigParams {
  transferParamsUrl: string;
  treeParamsUrl: string;
  transferVkUrl: string;
  treeVkUrl: string;
}

export type Tokens = {
  [address: string]: Token;
};

export interface Token {
  chainId: number,
  poolAddress: string;
  relayerUrl: string;
  coldStorageConfigPath: string;
  // Account birthday:
  //  no transactions associated with the account should exist lower that index
  //  set -1 to use the latest index (creating _NEW_ account)
  birthindex: number | undefined;
  proverMode: ProverMode;
  delegatedProverUrl: string | undefined;
}

export enum ProverMode {
  Local = "Local",
  Delegated = "Delegated",
  DelegatedWithFallback = "DelegatedWithFallback"
}
