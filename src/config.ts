import { bufToHex } from "./utils";
import { hash } from 'tweetnacl';

export interface SnarkConfigParams {
  transferParamsUrl: string;
  transferVkUrl: string;
}

export interface Chain {
  rpcUrls: string[];
}

export type Chains = {
  [chainId: string]: Chain;
};

export type Pools = {
  [name: string]: Pool;
};

export interface Pool {
  chainId: number,
  poolAddress: string;
  tokenAddress: string,
  relayerUrls: string[];
  delegatedProverUrls: string[];
  coldStorageConfigPath?: string;
  feeDecimals?: number;
}

export enum ProverMode {
  Local = "Local",
  Delegated = "Delegated",
  DelegatedWithFallback = "DelegatedWithFallback"
}

export interface ClientConfig {
  // A map of supported pools (pool name => pool params)
  pools: Pools;
  // A map of supported chains (chain id => chain params)
  chains: Chains;
  // Pathses for params and verification keys
  // (currenly we assume the parameters are the same for the all pools)
  snarkParams: SnarkConfigParams;
  // Support ID - unique random string to track user's activity for support purposes
  supportId?: string;
  // By default MT mode selects automatically depended on browser
  // This flag can override autoselection behaviour
  forcedMultithreading?: boolean;
}

export interface AccountConfig {
  // Spending key for the account
  sk: Uint8Array;
  // Initial (current) pool alias (e.g. 'BOB-Polygon' or 'BOB-Optimism')
  // The pool can be switched later without logout
  pool: string;
  // Account birthday for selected pool
  //  no transactions associated with the account should exist lower that index
  //  set -1 to use the latest index (ONLY for creating _NEW_ account)
  birthindex?: number;
  // Current prover mode (local, delegated, delegated with fallback)
  proverMode: ProverMode;
}

// Create account unique ID based on the pool and spending key
export function accountId(acc: AccountConfig): string {
  const userId = bufToHex(hash(acc.sk)).slice(0, 32);
  return `${acc.pool}.${userId}`;
}