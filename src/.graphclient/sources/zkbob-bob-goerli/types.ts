// @ts-nocheck

import { InContextSdkMethod } from '@graphql-mesh/types';
import { MeshContext } from '@graphql-mesh/runtime';

export namespace ZkbobBobGoerliTypes {
  export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  BigDecimal: any;
  BigInt: any;
  Bytes: any;
  Int8: any;
};

export type BlockChangedFilter = {
  number_gte: Scalars['Int'];
};

export type Block_height = {
  hash?: InputMaybe<Scalars['Bytes']>;
  number?: InputMaybe<Scalars['Int']>;
  number_gte?: InputMaybe<Scalars['Int']>;
};

export type DDBatchOperation = Operation & {
  id: Scalars['String'];
  pooltx: PoolTx;
  delegated_deposits: Array<DirectDeposit>;
};


export type DDBatchOperationdelegated_depositsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DirectDeposit_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<DirectDeposit_filter>;
};

export type DDBatchOperation_filter = {
  id?: InputMaybe<Scalars['String']>;
  id_not?: InputMaybe<Scalars['String']>;
  id_gt?: InputMaybe<Scalars['String']>;
  id_lt?: InputMaybe<Scalars['String']>;
  id_gte?: InputMaybe<Scalars['String']>;
  id_lte?: InputMaybe<Scalars['String']>;
  id_in?: InputMaybe<Array<Scalars['String']>>;
  id_not_in?: InputMaybe<Array<Scalars['String']>>;
  id_contains?: InputMaybe<Scalars['String']>;
  id_contains_nocase?: InputMaybe<Scalars['String']>;
  id_not_contains?: InputMaybe<Scalars['String']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  id_starts_with?: InputMaybe<Scalars['String']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_starts_with?: InputMaybe<Scalars['String']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_ends_with?: InputMaybe<Scalars['String']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_ends_with?: InputMaybe<Scalars['String']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx?: InputMaybe<Scalars['String']>;
  pooltx_not?: InputMaybe<Scalars['String']>;
  pooltx_gt?: InputMaybe<Scalars['String']>;
  pooltx_lt?: InputMaybe<Scalars['String']>;
  pooltx_gte?: InputMaybe<Scalars['String']>;
  pooltx_lte?: InputMaybe<Scalars['String']>;
  pooltx_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_not_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_contains?: InputMaybe<Scalars['String']>;
  pooltx_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_contains?: InputMaybe<Scalars['String']>;
  pooltx_not_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_?: InputMaybe<PoolTx_filter>;
  delegated_deposits?: InputMaybe<Array<Scalars['String']>>;
  delegated_deposits_not?: InputMaybe<Array<Scalars['String']>>;
  delegated_deposits_contains?: InputMaybe<Array<Scalars['String']>>;
  delegated_deposits_contains_nocase?: InputMaybe<Array<Scalars['String']>>;
  delegated_deposits_not_contains?: InputMaybe<Array<Scalars['String']>>;
  delegated_deposits_not_contains_nocase?: InputMaybe<Array<Scalars['String']>>;
  delegated_deposits_?: InputMaybe<DirectDeposit_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<DDBatchOperation_filter>>>;
  or?: InputMaybe<Array<InputMaybe<DDBatchOperation_filter>>>;
};

export type DDBatchOperation_orderBy =
  | 'id'
  | 'pooltx'
  | 'pooltx__id'
  | 'pooltx__tx'
  | 'pooltx__ts'
  | 'pooltx__all_messages_hash'
  | 'pooltx__type'
  | 'pooltx__message'
  | 'pooltx__gas_used'
  | 'pooltx__calldata'
  | 'delegated_deposits';

export type DepositOperation = Operation & {
  id: Scalars['String'];
  pooltx: PoolTx;
  nullifier: Scalars['BigInt'];
  index: Scalars['BigInt'];
  token_amount: Scalars['BigInt'];
  fee: Scalars['BigInt'];
};

export type DepositOperation_filter = {
  id?: InputMaybe<Scalars['String']>;
  id_not?: InputMaybe<Scalars['String']>;
  id_gt?: InputMaybe<Scalars['String']>;
  id_lt?: InputMaybe<Scalars['String']>;
  id_gte?: InputMaybe<Scalars['String']>;
  id_lte?: InputMaybe<Scalars['String']>;
  id_in?: InputMaybe<Array<Scalars['String']>>;
  id_not_in?: InputMaybe<Array<Scalars['String']>>;
  id_contains?: InputMaybe<Scalars['String']>;
  id_contains_nocase?: InputMaybe<Scalars['String']>;
  id_not_contains?: InputMaybe<Scalars['String']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  id_starts_with?: InputMaybe<Scalars['String']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_starts_with?: InputMaybe<Scalars['String']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_ends_with?: InputMaybe<Scalars['String']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_ends_with?: InputMaybe<Scalars['String']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx?: InputMaybe<Scalars['String']>;
  pooltx_not?: InputMaybe<Scalars['String']>;
  pooltx_gt?: InputMaybe<Scalars['String']>;
  pooltx_lt?: InputMaybe<Scalars['String']>;
  pooltx_gte?: InputMaybe<Scalars['String']>;
  pooltx_lte?: InputMaybe<Scalars['String']>;
  pooltx_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_not_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_contains?: InputMaybe<Scalars['String']>;
  pooltx_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_contains?: InputMaybe<Scalars['String']>;
  pooltx_not_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_?: InputMaybe<PoolTx_filter>;
  nullifier?: InputMaybe<Scalars['BigInt']>;
  nullifier_not?: InputMaybe<Scalars['BigInt']>;
  nullifier_gt?: InputMaybe<Scalars['BigInt']>;
  nullifier_lt?: InputMaybe<Scalars['BigInt']>;
  nullifier_gte?: InputMaybe<Scalars['BigInt']>;
  nullifier_lte?: InputMaybe<Scalars['BigInt']>;
  nullifier_in?: InputMaybe<Array<Scalars['BigInt']>>;
  nullifier_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  token_amount?: InputMaybe<Scalars['BigInt']>;
  token_amount_not?: InputMaybe<Scalars['BigInt']>;
  token_amount_gt?: InputMaybe<Scalars['BigInt']>;
  token_amount_lt?: InputMaybe<Scalars['BigInt']>;
  token_amount_gte?: InputMaybe<Scalars['BigInt']>;
  token_amount_lte?: InputMaybe<Scalars['BigInt']>;
  token_amount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  token_amount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  fee?: InputMaybe<Scalars['BigInt']>;
  fee_not?: InputMaybe<Scalars['BigInt']>;
  fee_gt?: InputMaybe<Scalars['BigInt']>;
  fee_lt?: InputMaybe<Scalars['BigInt']>;
  fee_gte?: InputMaybe<Scalars['BigInt']>;
  fee_lte?: InputMaybe<Scalars['BigInt']>;
  fee_in?: InputMaybe<Array<Scalars['BigInt']>>;
  fee_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<DepositOperation_filter>>>;
  or?: InputMaybe<Array<InputMaybe<DepositOperation_filter>>>;
};

export type DepositOperation_orderBy =
  | 'id'
  | 'pooltx'
  | 'pooltx__id'
  | 'pooltx__tx'
  | 'pooltx__ts'
  | 'pooltx__all_messages_hash'
  | 'pooltx__type'
  | 'pooltx__message'
  | 'pooltx__gas_used'
  | 'pooltx__calldata'
  | 'nullifier'
  | 'index'
  | 'token_amount'
  | 'fee';

export type DirectDeposit = {
  id: Scalars['String'];
  index: Scalars['BigInt'];
  pending: Scalars['Boolean'];
  completed: Scalars['Boolean'];
  refunded: Scalars['Boolean'];
  sender: Scalars['Bytes'];
  fallbackUser: Scalars['Bytes'];
  zkAddress_diversifier: Scalars['Bytes'];
  zkAddress_pk: Scalars['Bytes'];
  deposit: Scalars['BigInt'];
  fee: Scalars['BigInt'];
  bnInit: Scalars['BigInt'];
  tsInit: Scalars['BigInt'];
  txInit: Scalars['Bytes'];
  payment?: Maybe<Payment>;
  bnClosed?: Maybe<Scalars['BigInt']>;
  tsClosed?: Maybe<Scalars['BigInt']>;
  txClosed?: Maybe<Scalars['Bytes']>;
};

export type DirectDeposit_filter = {
  id?: InputMaybe<Scalars['String']>;
  id_not?: InputMaybe<Scalars['String']>;
  id_gt?: InputMaybe<Scalars['String']>;
  id_lt?: InputMaybe<Scalars['String']>;
  id_gte?: InputMaybe<Scalars['String']>;
  id_lte?: InputMaybe<Scalars['String']>;
  id_in?: InputMaybe<Array<Scalars['String']>>;
  id_not_in?: InputMaybe<Array<Scalars['String']>>;
  id_contains?: InputMaybe<Scalars['String']>;
  id_contains_nocase?: InputMaybe<Scalars['String']>;
  id_not_contains?: InputMaybe<Scalars['String']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  id_starts_with?: InputMaybe<Scalars['String']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_starts_with?: InputMaybe<Scalars['String']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_ends_with?: InputMaybe<Scalars['String']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_ends_with?: InputMaybe<Scalars['String']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  pending?: InputMaybe<Scalars['Boolean']>;
  pending_not?: InputMaybe<Scalars['Boolean']>;
  pending_in?: InputMaybe<Array<Scalars['Boolean']>>;
  pending_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  completed?: InputMaybe<Scalars['Boolean']>;
  completed_not?: InputMaybe<Scalars['Boolean']>;
  completed_in?: InputMaybe<Array<Scalars['Boolean']>>;
  completed_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  refunded?: InputMaybe<Scalars['Boolean']>;
  refunded_not?: InputMaybe<Scalars['Boolean']>;
  refunded_in?: InputMaybe<Array<Scalars['Boolean']>>;
  refunded_not_in?: InputMaybe<Array<Scalars['Boolean']>>;
  sender?: InputMaybe<Scalars['Bytes']>;
  sender_not?: InputMaybe<Scalars['Bytes']>;
  sender_gt?: InputMaybe<Scalars['Bytes']>;
  sender_lt?: InputMaybe<Scalars['Bytes']>;
  sender_gte?: InputMaybe<Scalars['Bytes']>;
  sender_lte?: InputMaybe<Scalars['Bytes']>;
  sender_in?: InputMaybe<Array<Scalars['Bytes']>>;
  sender_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  sender_contains?: InputMaybe<Scalars['Bytes']>;
  sender_not_contains?: InputMaybe<Scalars['Bytes']>;
  fallbackUser?: InputMaybe<Scalars['Bytes']>;
  fallbackUser_not?: InputMaybe<Scalars['Bytes']>;
  fallbackUser_gt?: InputMaybe<Scalars['Bytes']>;
  fallbackUser_lt?: InputMaybe<Scalars['Bytes']>;
  fallbackUser_gte?: InputMaybe<Scalars['Bytes']>;
  fallbackUser_lte?: InputMaybe<Scalars['Bytes']>;
  fallbackUser_in?: InputMaybe<Array<Scalars['Bytes']>>;
  fallbackUser_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  fallbackUser_contains?: InputMaybe<Scalars['Bytes']>;
  fallbackUser_not_contains?: InputMaybe<Scalars['Bytes']>;
  zkAddress_diversifier?: InputMaybe<Scalars['Bytes']>;
  zkAddress_diversifier_not?: InputMaybe<Scalars['Bytes']>;
  zkAddress_diversifier_gt?: InputMaybe<Scalars['Bytes']>;
  zkAddress_diversifier_lt?: InputMaybe<Scalars['Bytes']>;
  zkAddress_diversifier_gte?: InputMaybe<Scalars['Bytes']>;
  zkAddress_diversifier_lte?: InputMaybe<Scalars['Bytes']>;
  zkAddress_diversifier_in?: InputMaybe<Array<Scalars['Bytes']>>;
  zkAddress_diversifier_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  zkAddress_diversifier_contains?: InputMaybe<Scalars['Bytes']>;
  zkAddress_diversifier_not_contains?: InputMaybe<Scalars['Bytes']>;
  zkAddress_pk?: InputMaybe<Scalars['Bytes']>;
  zkAddress_pk_not?: InputMaybe<Scalars['Bytes']>;
  zkAddress_pk_gt?: InputMaybe<Scalars['Bytes']>;
  zkAddress_pk_lt?: InputMaybe<Scalars['Bytes']>;
  zkAddress_pk_gte?: InputMaybe<Scalars['Bytes']>;
  zkAddress_pk_lte?: InputMaybe<Scalars['Bytes']>;
  zkAddress_pk_in?: InputMaybe<Array<Scalars['Bytes']>>;
  zkAddress_pk_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  zkAddress_pk_contains?: InputMaybe<Scalars['Bytes']>;
  zkAddress_pk_not_contains?: InputMaybe<Scalars['Bytes']>;
  deposit?: InputMaybe<Scalars['BigInt']>;
  deposit_not?: InputMaybe<Scalars['BigInt']>;
  deposit_gt?: InputMaybe<Scalars['BigInt']>;
  deposit_lt?: InputMaybe<Scalars['BigInt']>;
  deposit_gte?: InputMaybe<Scalars['BigInt']>;
  deposit_lte?: InputMaybe<Scalars['BigInt']>;
  deposit_in?: InputMaybe<Array<Scalars['BigInt']>>;
  deposit_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  fee?: InputMaybe<Scalars['BigInt']>;
  fee_not?: InputMaybe<Scalars['BigInt']>;
  fee_gt?: InputMaybe<Scalars['BigInt']>;
  fee_lt?: InputMaybe<Scalars['BigInt']>;
  fee_gte?: InputMaybe<Scalars['BigInt']>;
  fee_lte?: InputMaybe<Scalars['BigInt']>;
  fee_in?: InputMaybe<Array<Scalars['BigInt']>>;
  fee_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  bnInit?: InputMaybe<Scalars['BigInt']>;
  bnInit_not?: InputMaybe<Scalars['BigInt']>;
  bnInit_gt?: InputMaybe<Scalars['BigInt']>;
  bnInit_lt?: InputMaybe<Scalars['BigInt']>;
  bnInit_gte?: InputMaybe<Scalars['BigInt']>;
  bnInit_lte?: InputMaybe<Scalars['BigInt']>;
  bnInit_in?: InputMaybe<Array<Scalars['BigInt']>>;
  bnInit_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  tsInit?: InputMaybe<Scalars['BigInt']>;
  tsInit_not?: InputMaybe<Scalars['BigInt']>;
  tsInit_gt?: InputMaybe<Scalars['BigInt']>;
  tsInit_lt?: InputMaybe<Scalars['BigInt']>;
  tsInit_gte?: InputMaybe<Scalars['BigInt']>;
  tsInit_lte?: InputMaybe<Scalars['BigInt']>;
  tsInit_in?: InputMaybe<Array<Scalars['BigInt']>>;
  tsInit_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  txInit?: InputMaybe<Scalars['Bytes']>;
  txInit_not?: InputMaybe<Scalars['Bytes']>;
  txInit_gt?: InputMaybe<Scalars['Bytes']>;
  txInit_lt?: InputMaybe<Scalars['Bytes']>;
  txInit_gte?: InputMaybe<Scalars['Bytes']>;
  txInit_lte?: InputMaybe<Scalars['Bytes']>;
  txInit_in?: InputMaybe<Array<Scalars['Bytes']>>;
  txInit_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  txInit_contains?: InputMaybe<Scalars['Bytes']>;
  txInit_not_contains?: InputMaybe<Scalars['Bytes']>;
  payment?: InputMaybe<Scalars['String']>;
  payment_not?: InputMaybe<Scalars['String']>;
  payment_gt?: InputMaybe<Scalars['String']>;
  payment_lt?: InputMaybe<Scalars['String']>;
  payment_gte?: InputMaybe<Scalars['String']>;
  payment_lte?: InputMaybe<Scalars['String']>;
  payment_in?: InputMaybe<Array<Scalars['String']>>;
  payment_not_in?: InputMaybe<Array<Scalars['String']>>;
  payment_contains?: InputMaybe<Scalars['String']>;
  payment_contains_nocase?: InputMaybe<Scalars['String']>;
  payment_not_contains?: InputMaybe<Scalars['String']>;
  payment_not_contains_nocase?: InputMaybe<Scalars['String']>;
  payment_starts_with?: InputMaybe<Scalars['String']>;
  payment_starts_with_nocase?: InputMaybe<Scalars['String']>;
  payment_not_starts_with?: InputMaybe<Scalars['String']>;
  payment_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  payment_ends_with?: InputMaybe<Scalars['String']>;
  payment_ends_with_nocase?: InputMaybe<Scalars['String']>;
  payment_not_ends_with?: InputMaybe<Scalars['String']>;
  payment_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  payment_?: InputMaybe<Payment_filter>;
  bnClosed?: InputMaybe<Scalars['BigInt']>;
  bnClosed_not?: InputMaybe<Scalars['BigInt']>;
  bnClosed_gt?: InputMaybe<Scalars['BigInt']>;
  bnClosed_lt?: InputMaybe<Scalars['BigInt']>;
  bnClosed_gte?: InputMaybe<Scalars['BigInt']>;
  bnClosed_lte?: InputMaybe<Scalars['BigInt']>;
  bnClosed_in?: InputMaybe<Array<Scalars['BigInt']>>;
  bnClosed_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  tsClosed?: InputMaybe<Scalars['BigInt']>;
  tsClosed_not?: InputMaybe<Scalars['BigInt']>;
  tsClosed_gt?: InputMaybe<Scalars['BigInt']>;
  tsClosed_lt?: InputMaybe<Scalars['BigInt']>;
  tsClosed_gte?: InputMaybe<Scalars['BigInt']>;
  tsClosed_lte?: InputMaybe<Scalars['BigInt']>;
  tsClosed_in?: InputMaybe<Array<Scalars['BigInt']>>;
  tsClosed_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  txClosed?: InputMaybe<Scalars['Bytes']>;
  txClosed_not?: InputMaybe<Scalars['Bytes']>;
  txClosed_gt?: InputMaybe<Scalars['Bytes']>;
  txClosed_lt?: InputMaybe<Scalars['Bytes']>;
  txClosed_gte?: InputMaybe<Scalars['Bytes']>;
  txClosed_lte?: InputMaybe<Scalars['Bytes']>;
  txClosed_in?: InputMaybe<Array<Scalars['Bytes']>>;
  txClosed_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  txClosed_contains?: InputMaybe<Scalars['Bytes']>;
  txClosed_not_contains?: InputMaybe<Scalars['Bytes']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<DirectDeposit_filter>>>;
  or?: InputMaybe<Array<InputMaybe<DirectDeposit_filter>>>;
};

export type DirectDeposit_orderBy =
  | 'id'
  | 'index'
  | 'pending'
  | 'completed'
  | 'refunded'
  | 'sender'
  | 'fallbackUser'
  | 'zkAddress_diversifier'
  | 'zkAddress_pk'
  | 'deposit'
  | 'fee'
  | 'bnInit'
  | 'tsInit'
  | 'txInit'
  | 'payment'
  | 'payment__id'
  | 'payment__sender'
  | 'payment__token'
  | 'payment__note'
  | 'bnClosed'
  | 'tsClosed'
  | 'txClosed';

export type LastSyncBlock = {
  id: Scalars['Bytes'];
  block?: Maybe<Scalars['BigInt']>;
};

export type LastSyncBlock_filter = {
  id?: InputMaybe<Scalars['Bytes']>;
  id_not?: InputMaybe<Scalars['Bytes']>;
  id_gt?: InputMaybe<Scalars['Bytes']>;
  id_lt?: InputMaybe<Scalars['Bytes']>;
  id_gte?: InputMaybe<Scalars['Bytes']>;
  id_lte?: InputMaybe<Scalars['Bytes']>;
  id_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  id_contains?: InputMaybe<Scalars['Bytes']>;
  id_not_contains?: InputMaybe<Scalars['Bytes']>;
  block?: InputMaybe<Scalars['BigInt']>;
  block_not?: InputMaybe<Scalars['BigInt']>;
  block_gt?: InputMaybe<Scalars['BigInt']>;
  block_lt?: InputMaybe<Scalars['BigInt']>;
  block_gte?: InputMaybe<Scalars['BigInt']>;
  block_lte?: InputMaybe<Scalars['BigInt']>;
  block_in?: InputMaybe<Array<Scalars['BigInt']>>;
  block_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<LastSyncBlock_filter>>>;
  or?: InputMaybe<Array<InputMaybe<LastSyncBlock_filter>>>;
};

export type LastSyncBlock_orderBy =
  | 'id'
  | 'block';

export type Operation = {
  id: Scalars['String'];
  pooltx: PoolTx;
};

export type Operation_filter = {
  id?: InputMaybe<Scalars['String']>;
  id_not?: InputMaybe<Scalars['String']>;
  id_gt?: InputMaybe<Scalars['String']>;
  id_lt?: InputMaybe<Scalars['String']>;
  id_gte?: InputMaybe<Scalars['String']>;
  id_lte?: InputMaybe<Scalars['String']>;
  id_in?: InputMaybe<Array<Scalars['String']>>;
  id_not_in?: InputMaybe<Array<Scalars['String']>>;
  id_contains?: InputMaybe<Scalars['String']>;
  id_contains_nocase?: InputMaybe<Scalars['String']>;
  id_not_contains?: InputMaybe<Scalars['String']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  id_starts_with?: InputMaybe<Scalars['String']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_starts_with?: InputMaybe<Scalars['String']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_ends_with?: InputMaybe<Scalars['String']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_ends_with?: InputMaybe<Scalars['String']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx?: InputMaybe<Scalars['String']>;
  pooltx_not?: InputMaybe<Scalars['String']>;
  pooltx_gt?: InputMaybe<Scalars['String']>;
  pooltx_lt?: InputMaybe<Scalars['String']>;
  pooltx_gte?: InputMaybe<Scalars['String']>;
  pooltx_lte?: InputMaybe<Scalars['String']>;
  pooltx_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_not_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_contains?: InputMaybe<Scalars['String']>;
  pooltx_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_contains?: InputMaybe<Scalars['String']>;
  pooltx_not_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_?: InputMaybe<PoolTx_filter>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Operation_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Operation_filter>>>;
};

export type Operation_orderBy =
  | 'id'
  | 'pooltx'
  | 'pooltx__id'
  | 'pooltx__tx'
  | 'pooltx__ts'
  | 'pooltx__all_messages_hash'
  | 'pooltx__type'
  | 'pooltx__message'
  | 'pooltx__gas_used'
  | 'pooltx__calldata';

/** Defines the order direction, either ascending or descending */
export type OrderDirection =
  | 'asc'
  | 'desc';

export type Payment = {
  id: Scalars['String'];
  sender?: Maybe<Scalars['Bytes']>;
  delegated_deposit: DirectDeposit;
  token: Scalars['Bytes'];
  note?: Maybe<Scalars['Bytes']>;
};

export type Payment_filter = {
  id?: InputMaybe<Scalars['String']>;
  id_not?: InputMaybe<Scalars['String']>;
  id_gt?: InputMaybe<Scalars['String']>;
  id_lt?: InputMaybe<Scalars['String']>;
  id_gte?: InputMaybe<Scalars['String']>;
  id_lte?: InputMaybe<Scalars['String']>;
  id_in?: InputMaybe<Array<Scalars['String']>>;
  id_not_in?: InputMaybe<Array<Scalars['String']>>;
  id_contains?: InputMaybe<Scalars['String']>;
  id_contains_nocase?: InputMaybe<Scalars['String']>;
  id_not_contains?: InputMaybe<Scalars['String']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  id_starts_with?: InputMaybe<Scalars['String']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_starts_with?: InputMaybe<Scalars['String']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_ends_with?: InputMaybe<Scalars['String']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_ends_with?: InputMaybe<Scalars['String']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  sender?: InputMaybe<Scalars['Bytes']>;
  sender_not?: InputMaybe<Scalars['Bytes']>;
  sender_gt?: InputMaybe<Scalars['Bytes']>;
  sender_lt?: InputMaybe<Scalars['Bytes']>;
  sender_gte?: InputMaybe<Scalars['Bytes']>;
  sender_lte?: InputMaybe<Scalars['Bytes']>;
  sender_in?: InputMaybe<Array<Scalars['Bytes']>>;
  sender_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  sender_contains?: InputMaybe<Scalars['Bytes']>;
  sender_not_contains?: InputMaybe<Scalars['Bytes']>;
  delegated_deposit?: InputMaybe<Scalars['String']>;
  delegated_deposit_not?: InputMaybe<Scalars['String']>;
  delegated_deposit_gt?: InputMaybe<Scalars['String']>;
  delegated_deposit_lt?: InputMaybe<Scalars['String']>;
  delegated_deposit_gte?: InputMaybe<Scalars['String']>;
  delegated_deposit_lte?: InputMaybe<Scalars['String']>;
  delegated_deposit_in?: InputMaybe<Array<Scalars['String']>>;
  delegated_deposit_not_in?: InputMaybe<Array<Scalars['String']>>;
  delegated_deposit_contains?: InputMaybe<Scalars['String']>;
  delegated_deposit_contains_nocase?: InputMaybe<Scalars['String']>;
  delegated_deposit_not_contains?: InputMaybe<Scalars['String']>;
  delegated_deposit_not_contains_nocase?: InputMaybe<Scalars['String']>;
  delegated_deposit_starts_with?: InputMaybe<Scalars['String']>;
  delegated_deposit_starts_with_nocase?: InputMaybe<Scalars['String']>;
  delegated_deposit_not_starts_with?: InputMaybe<Scalars['String']>;
  delegated_deposit_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  delegated_deposit_ends_with?: InputMaybe<Scalars['String']>;
  delegated_deposit_ends_with_nocase?: InputMaybe<Scalars['String']>;
  delegated_deposit_not_ends_with?: InputMaybe<Scalars['String']>;
  delegated_deposit_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  delegated_deposit_?: InputMaybe<DirectDeposit_filter>;
  token?: InputMaybe<Scalars['Bytes']>;
  token_not?: InputMaybe<Scalars['Bytes']>;
  token_gt?: InputMaybe<Scalars['Bytes']>;
  token_lt?: InputMaybe<Scalars['Bytes']>;
  token_gte?: InputMaybe<Scalars['Bytes']>;
  token_lte?: InputMaybe<Scalars['Bytes']>;
  token_in?: InputMaybe<Array<Scalars['Bytes']>>;
  token_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  token_contains?: InputMaybe<Scalars['Bytes']>;
  token_not_contains?: InputMaybe<Scalars['Bytes']>;
  note?: InputMaybe<Scalars['Bytes']>;
  note_not?: InputMaybe<Scalars['Bytes']>;
  note_gt?: InputMaybe<Scalars['Bytes']>;
  note_lt?: InputMaybe<Scalars['Bytes']>;
  note_gte?: InputMaybe<Scalars['Bytes']>;
  note_lte?: InputMaybe<Scalars['Bytes']>;
  note_in?: InputMaybe<Array<Scalars['Bytes']>>;
  note_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  note_contains?: InputMaybe<Scalars['Bytes']>;
  note_not_contains?: InputMaybe<Scalars['Bytes']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Payment_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Payment_filter>>>;
};

export type Payment_orderBy =
  | 'id'
  | 'sender'
  | 'delegated_deposit'
  | 'delegated_deposit__id'
  | 'delegated_deposit__index'
  | 'delegated_deposit__pending'
  | 'delegated_deposit__completed'
  | 'delegated_deposit__refunded'
  | 'delegated_deposit__sender'
  | 'delegated_deposit__fallbackUser'
  | 'delegated_deposit__zkAddress_diversifier'
  | 'delegated_deposit__zkAddress_pk'
  | 'delegated_deposit__deposit'
  | 'delegated_deposit__fee'
  | 'delegated_deposit__bnInit'
  | 'delegated_deposit__tsInit'
  | 'delegated_deposit__txInit'
  | 'delegated_deposit__bnClosed'
  | 'delegated_deposit__tsClosed'
  | 'delegated_deposit__txClosed'
  | 'token'
  | 'note';

export type PermittableDepositOperation = Operation & {
  id: Scalars['String'];
  pooltx: PoolTx;
  nullifier: Scalars['BigInt'];
  index: Scalars['BigInt'];
  token_amount: Scalars['BigInt'];
  fee: Scalars['BigInt'];
  permit_deadline: Scalars['BigInt'];
  permit_holder: Scalars['Bytes'];
  sig: Scalars['Bytes'];
};

export type PermittableDepositOperation_filter = {
  id?: InputMaybe<Scalars['String']>;
  id_not?: InputMaybe<Scalars['String']>;
  id_gt?: InputMaybe<Scalars['String']>;
  id_lt?: InputMaybe<Scalars['String']>;
  id_gte?: InputMaybe<Scalars['String']>;
  id_lte?: InputMaybe<Scalars['String']>;
  id_in?: InputMaybe<Array<Scalars['String']>>;
  id_not_in?: InputMaybe<Array<Scalars['String']>>;
  id_contains?: InputMaybe<Scalars['String']>;
  id_contains_nocase?: InputMaybe<Scalars['String']>;
  id_not_contains?: InputMaybe<Scalars['String']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  id_starts_with?: InputMaybe<Scalars['String']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_starts_with?: InputMaybe<Scalars['String']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_ends_with?: InputMaybe<Scalars['String']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_ends_with?: InputMaybe<Scalars['String']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx?: InputMaybe<Scalars['String']>;
  pooltx_not?: InputMaybe<Scalars['String']>;
  pooltx_gt?: InputMaybe<Scalars['String']>;
  pooltx_lt?: InputMaybe<Scalars['String']>;
  pooltx_gte?: InputMaybe<Scalars['String']>;
  pooltx_lte?: InputMaybe<Scalars['String']>;
  pooltx_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_not_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_contains?: InputMaybe<Scalars['String']>;
  pooltx_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_contains?: InputMaybe<Scalars['String']>;
  pooltx_not_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_?: InputMaybe<PoolTx_filter>;
  nullifier?: InputMaybe<Scalars['BigInt']>;
  nullifier_not?: InputMaybe<Scalars['BigInt']>;
  nullifier_gt?: InputMaybe<Scalars['BigInt']>;
  nullifier_lt?: InputMaybe<Scalars['BigInt']>;
  nullifier_gte?: InputMaybe<Scalars['BigInt']>;
  nullifier_lte?: InputMaybe<Scalars['BigInt']>;
  nullifier_in?: InputMaybe<Array<Scalars['BigInt']>>;
  nullifier_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  token_amount?: InputMaybe<Scalars['BigInt']>;
  token_amount_not?: InputMaybe<Scalars['BigInt']>;
  token_amount_gt?: InputMaybe<Scalars['BigInt']>;
  token_amount_lt?: InputMaybe<Scalars['BigInt']>;
  token_amount_gte?: InputMaybe<Scalars['BigInt']>;
  token_amount_lte?: InputMaybe<Scalars['BigInt']>;
  token_amount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  token_amount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  fee?: InputMaybe<Scalars['BigInt']>;
  fee_not?: InputMaybe<Scalars['BigInt']>;
  fee_gt?: InputMaybe<Scalars['BigInt']>;
  fee_lt?: InputMaybe<Scalars['BigInt']>;
  fee_gte?: InputMaybe<Scalars['BigInt']>;
  fee_lte?: InputMaybe<Scalars['BigInt']>;
  fee_in?: InputMaybe<Array<Scalars['BigInt']>>;
  fee_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  permit_deadline?: InputMaybe<Scalars['BigInt']>;
  permit_deadline_not?: InputMaybe<Scalars['BigInt']>;
  permit_deadline_gt?: InputMaybe<Scalars['BigInt']>;
  permit_deadline_lt?: InputMaybe<Scalars['BigInt']>;
  permit_deadline_gte?: InputMaybe<Scalars['BigInt']>;
  permit_deadline_lte?: InputMaybe<Scalars['BigInt']>;
  permit_deadline_in?: InputMaybe<Array<Scalars['BigInt']>>;
  permit_deadline_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  permit_holder?: InputMaybe<Scalars['Bytes']>;
  permit_holder_not?: InputMaybe<Scalars['Bytes']>;
  permit_holder_gt?: InputMaybe<Scalars['Bytes']>;
  permit_holder_lt?: InputMaybe<Scalars['Bytes']>;
  permit_holder_gte?: InputMaybe<Scalars['Bytes']>;
  permit_holder_lte?: InputMaybe<Scalars['Bytes']>;
  permit_holder_in?: InputMaybe<Array<Scalars['Bytes']>>;
  permit_holder_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  permit_holder_contains?: InputMaybe<Scalars['Bytes']>;
  permit_holder_not_contains?: InputMaybe<Scalars['Bytes']>;
  sig?: InputMaybe<Scalars['Bytes']>;
  sig_not?: InputMaybe<Scalars['Bytes']>;
  sig_gt?: InputMaybe<Scalars['Bytes']>;
  sig_lt?: InputMaybe<Scalars['Bytes']>;
  sig_gte?: InputMaybe<Scalars['Bytes']>;
  sig_lte?: InputMaybe<Scalars['Bytes']>;
  sig_in?: InputMaybe<Array<Scalars['Bytes']>>;
  sig_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  sig_contains?: InputMaybe<Scalars['Bytes']>;
  sig_not_contains?: InputMaybe<Scalars['Bytes']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<PermittableDepositOperation_filter>>>;
  or?: InputMaybe<Array<InputMaybe<PermittableDepositOperation_filter>>>;
};

export type PermittableDepositOperation_orderBy =
  | 'id'
  | 'pooltx'
  | 'pooltx__id'
  | 'pooltx__tx'
  | 'pooltx__ts'
  | 'pooltx__all_messages_hash'
  | 'pooltx__type'
  | 'pooltx__message'
  | 'pooltx__gas_used'
  | 'pooltx__calldata'
  | 'nullifier'
  | 'index'
  | 'token_amount'
  | 'fee'
  | 'permit_deadline'
  | 'permit_holder'
  | 'sig';

export type PoolTx = {
  id: Scalars['String'];
  tx: Scalars['Bytes'];
  ts: Scalars['BigInt'];
  all_messages_hash: Scalars['Bytes'];
  type: Scalars['Int'];
  message: Scalars['Bytes'];
  gas_used: Scalars['Int'];
  zk: ZkCommon;
  operation: Operation;
  calldata: Scalars['Bytes'];
};

export type PoolTx_filter = {
  id?: InputMaybe<Scalars['String']>;
  id_not?: InputMaybe<Scalars['String']>;
  id_gt?: InputMaybe<Scalars['String']>;
  id_lt?: InputMaybe<Scalars['String']>;
  id_gte?: InputMaybe<Scalars['String']>;
  id_lte?: InputMaybe<Scalars['String']>;
  id_in?: InputMaybe<Array<Scalars['String']>>;
  id_not_in?: InputMaybe<Array<Scalars['String']>>;
  id_contains?: InputMaybe<Scalars['String']>;
  id_contains_nocase?: InputMaybe<Scalars['String']>;
  id_not_contains?: InputMaybe<Scalars['String']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  id_starts_with?: InputMaybe<Scalars['String']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_starts_with?: InputMaybe<Scalars['String']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_ends_with?: InputMaybe<Scalars['String']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_ends_with?: InputMaybe<Scalars['String']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  tx?: InputMaybe<Scalars['Bytes']>;
  tx_not?: InputMaybe<Scalars['Bytes']>;
  tx_gt?: InputMaybe<Scalars['Bytes']>;
  tx_lt?: InputMaybe<Scalars['Bytes']>;
  tx_gte?: InputMaybe<Scalars['Bytes']>;
  tx_lte?: InputMaybe<Scalars['Bytes']>;
  tx_in?: InputMaybe<Array<Scalars['Bytes']>>;
  tx_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  tx_contains?: InputMaybe<Scalars['Bytes']>;
  tx_not_contains?: InputMaybe<Scalars['Bytes']>;
  ts?: InputMaybe<Scalars['BigInt']>;
  ts_not?: InputMaybe<Scalars['BigInt']>;
  ts_gt?: InputMaybe<Scalars['BigInt']>;
  ts_lt?: InputMaybe<Scalars['BigInt']>;
  ts_gte?: InputMaybe<Scalars['BigInt']>;
  ts_lte?: InputMaybe<Scalars['BigInt']>;
  ts_in?: InputMaybe<Array<Scalars['BigInt']>>;
  ts_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  all_messages_hash?: InputMaybe<Scalars['Bytes']>;
  all_messages_hash_not?: InputMaybe<Scalars['Bytes']>;
  all_messages_hash_gt?: InputMaybe<Scalars['Bytes']>;
  all_messages_hash_lt?: InputMaybe<Scalars['Bytes']>;
  all_messages_hash_gte?: InputMaybe<Scalars['Bytes']>;
  all_messages_hash_lte?: InputMaybe<Scalars['Bytes']>;
  all_messages_hash_in?: InputMaybe<Array<Scalars['Bytes']>>;
  all_messages_hash_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  all_messages_hash_contains?: InputMaybe<Scalars['Bytes']>;
  all_messages_hash_not_contains?: InputMaybe<Scalars['Bytes']>;
  type?: InputMaybe<Scalars['Int']>;
  type_not?: InputMaybe<Scalars['Int']>;
  type_gt?: InputMaybe<Scalars['Int']>;
  type_lt?: InputMaybe<Scalars['Int']>;
  type_gte?: InputMaybe<Scalars['Int']>;
  type_lte?: InputMaybe<Scalars['Int']>;
  type_in?: InputMaybe<Array<Scalars['Int']>>;
  type_not_in?: InputMaybe<Array<Scalars['Int']>>;
  message?: InputMaybe<Scalars['Bytes']>;
  message_not?: InputMaybe<Scalars['Bytes']>;
  message_gt?: InputMaybe<Scalars['Bytes']>;
  message_lt?: InputMaybe<Scalars['Bytes']>;
  message_gte?: InputMaybe<Scalars['Bytes']>;
  message_lte?: InputMaybe<Scalars['Bytes']>;
  message_in?: InputMaybe<Array<Scalars['Bytes']>>;
  message_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  message_contains?: InputMaybe<Scalars['Bytes']>;
  message_not_contains?: InputMaybe<Scalars['Bytes']>;
  gas_used?: InputMaybe<Scalars['Int']>;
  gas_used_not?: InputMaybe<Scalars['Int']>;
  gas_used_gt?: InputMaybe<Scalars['Int']>;
  gas_used_lt?: InputMaybe<Scalars['Int']>;
  gas_used_gte?: InputMaybe<Scalars['Int']>;
  gas_used_lte?: InputMaybe<Scalars['Int']>;
  gas_used_in?: InputMaybe<Array<Scalars['Int']>>;
  gas_used_not_in?: InputMaybe<Array<Scalars['Int']>>;
  zk?: InputMaybe<Scalars['String']>;
  zk_not?: InputMaybe<Scalars['String']>;
  zk_gt?: InputMaybe<Scalars['String']>;
  zk_lt?: InputMaybe<Scalars['String']>;
  zk_gte?: InputMaybe<Scalars['String']>;
  zk_lte?: InputMaybe<Scalars['String']>;
  zk_in?: InputMaybe<Array<Scalars['String']>>;
  zk_not_in?: InputMaybe<Array<Scalars['String']>>;
  zk_contains?: InputMaybe<Scalars['String']>;
  zk_contains_nocase?: InputMaybe<Scalars['String']>;
  zk_not_contains?: InputMaybe<Scalars['String']>;
  zk_not_contains_nocase?: InputMaybe<Scalars['String']>;
  zk_starts_with?: InputMaybe<Scalars['String']>;
  zk_starts_with_nocase?: InputMaybe<Scalars['String']>;
  zk_not_starts_with?: InputMaybe<Scalars['String']>;
  zk_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  zk_ends_with?: InputMaybe<Scalars['String']>;
  zk_ends_with_nocase?: InputMaybe<Scalars['String']>;
  zk_not_ends_with?: InputMaybe<Scalars['String']>;
  zk_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  zk_?: InputMaybe<ZkCommon_filter>;
  operation?: InputMaybe<Scalars['String']>;
  operation_not?: InputMaybe<Scalars['String']>;
  operation_gt?: InputMaybe<Scalars['String']>;
  operation_lt?: InputMaybe<Scalars['String']>;
  operation_gte?: InputMaybe<Scalars['String']>;
  operation_lte?: InputMaybe<Scalars['String']>;
  operation_in?: InputMaybe<Array<Scalars['String']>>;
  operation_not_in?: InputMaybe<Array<Scalars['String']>>;
  operation_contains?: InputMaybe<Scalars['String']>;
  operation_contains_nocase?: InputMaybe<Scalars['String']>;
  operation_not_contains?: InputMaybe<Scalars['String']>;
  operation_not_contains_nocase?: InputMaybe<Scalars['String']>;
  operation_starts_with?: InputMaybe<Scalars['String']>;
  operation_starts_with_nocase?: InputMaybe<Scalars['String']>;
  operation_not_starts_with?: InputMaybe<Scalars['String']>;
  operation_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  operation_ends_with?: InputMaybe<Scalars['String']>;
  operation_ends_with_nocase?: InputMaybe<Scalars['String']>;
  operation_not_ends_with?: InputMaybe<Scalars['String']>;
  operation_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  operation_?: InputMaybe<Operation_filter>;
  calldata?: InputMaybe<Scalars['Bytes']>;
  calldata_not?: InputMaybe<Scalars['Bytes']>;
  calldata_gt?: InputMaybe<Scalars['Bytes']>;
  calldata_lt?: InputMaybe<Scalars['Bytes']>;
  calldata_gte?: InputMaybe<Scalars['Bytes']>;
  calldata_lte?: InputMaybe<Scalars['Bytes']>;
  calldata_in?: InputMaybe<Array<Scalars['Bytes']>>;
  calldata_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  calldata_contains?: InputMaybe<Scalars['Bytes']>;
  calldata_not_contains?: InputMaybe<Scalars['Bytes']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<PoolTx_filter>>>;
  or?: InputMaybe<Array<InputMaybe<PoolTx_filter>>>;
};

export type PoolTx_orderBy =
  | 'id'
  | 'tx'
  | 'ts'
  | 'all_messages_hash'
  | 'type'
  | 'message'
  | 'gas_used'
  | 'zk'
  | 'zk__id'
  | 'zk__out_commit'
  | 'zk__tree_root_after'
  | 'operation'
  | 'operation__id'
  | 'calldata';

export type Query = {
  directDeposit?: Maybe<DirectDeposit>;
  directDeposits: Array<DirectDeposit>;
  payment?: Maybe<Payment>;
  payments: Array<Payment>;
  zkCommon?: Maybe<ZkCommon>;
  zkCommons: Array<ZkCommon>;
  depositOperation?: Maybe<DepositOperation>;
  depositOperations: Array<DepositOperation>;
  transferOperation?: Maybe<TransferOperation>;
  transferOperations: Array<TransferOperation>;
  withdrawalOperation?: Maybe<WithdrawalOperation>;
  withdrawalOperations: Array<WithdrawalOperation>;
  permittableDepositOperation?: Maybe<PermittableDepositOperation>;
  permittableDepositOperations: Array<PermittableDepositOperation>;
  ddbatchOperation?: Maybe<DDBatchOperation>;
  ddbatchOperations: Array<DDBatchOperation>;
  poolTx?: Maybe<PoolTx>;
  poolTxes: Array<PoolTx>;
  lastSyncBlock?: Maybe<LastSyncBlock>;
  lastSyncBlocks: Array<LastSyncBlock>;
  operation?: Maybe<Operation>;
  operations: Array<Operation>;
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
};


export type QuerydirectDepositArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerydirectDepositsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DirectDeposit_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<DirectDeposit_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypaymentArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypaymentsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Payment_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Payment_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryzkCommonArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryzkCommonsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ZkCommon_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<ZkCommon_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerydepositOperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerydepositOperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DepositOperation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<DepositOperation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytransferOperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerytransferOperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<TransferOperation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<TransferOperation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerywithdrawalOperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerywithdrawalOperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<WithdrawalOperation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<WithdrawalOperation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypermittableDepositOperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypermittableDepositOperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PermittableDepositOperation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PermittableDepositOperation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryddbatchOperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryddbatchOperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DDBatchOperation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<DDBatchOperation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypoolTxArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerypoolTxesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PoolTx_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PoolTx_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerylastSyncBlockArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerylastSyncBlocksArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<LastSyncBlock_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<LastSyncBlock_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryoperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QueryoperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Operation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Operation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type Subscription = {
  directDeposit?: Maybe<DirectDeposit>;
  directDeposits: Array<DirectDeposit>;
  payment?: Maybe<Payment>;
  payments: Array<Payment>;
  zkCommon?: Maybe<ZkCommon>;
  zkCommons: Array<ZkCommon>;
  depositOperation?: Maybe<DepositOperation>;
  depositOperations: Array<DepositOperation>;
  transferOperation?: Maybe<TransferOperation>;
  transferOperations: Array<TransferOperation>;
  withdrawalOperation?: Maybe<WithdrawalOperation>;
  withdrawalOperations: Array<WithdrawalOperation>;
  permittableDepositOperation?: Maybe<PermittableDepositOperation>;
  permittableDepositOperations: Array<PermittableDepositOperation>;
  ddbatchOperation?: Maybe<DDBatchOperation>;
  ddbatchOperations: Array<DDBatchOperation>;
  poolTx?: Maybe<PoolTx>;
  poolTxes: Array<PoolTx>;
  lastSyncBlock?: Maybe<LastSyncBlock>;
  lastSyncBlocks: Array<LastSyncBlock>;
  operation?: Maybe<Operation>;
  operations: Array<Operation>;
  /** Access to subgraph metadata */
  _meta?: Maybe<_Meta_>;
};


export type SubscriptiondirectDepositArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiondirectDepositsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DirectDeposit_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<DirectDeposit_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpaymentArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpaymentsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Payment_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Payment_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionzkCommonArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionzkCommonsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<ZkCommon_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<ZkCommon_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiondepositOperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiondepositOperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DepositOperation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<DepositOperation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontransferOperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptiontransferOperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<TransferOperation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<TransferOperation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionwithdrawalOperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionwithdrawalOperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<WithdrawalOperation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<WithdrawalOperation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpermittableDepositOperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpermittableDepositOperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PermittableDepositOperation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PermittableDepositOperation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionddbatchOperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionddbatchOperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<DDBatchOperation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<DDBatchOperation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpoolTxArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionpoolTxesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<PoolTx_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<PoolTx_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionlastSyncBlockArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionlastSyncBlocksArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<LastSyncBlock_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<LastSyncBlock_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionoperationArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionoperationsArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Operation_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Operation_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type TransferOperation = Operation & {
  id: Scalars['String'];
  pooltx: PoolTx;
  nullifier: Scalars['BigInt'];
  index: Scalars['BigInt'];
  fee: Scalars['BigInt'];
};

export type TransferOperation_filter = {
  id?: InputMaybe<Scalars['String']>;
  id_not?: InputMaybe<Scalars['String']>;
  id_gt?: InputMaybe<Scalars['String']>;
  id_lt?: InputMaybe<Scalars['String']>;
  id_gte?: InputMaybe<Scalars['String']>;
  id_lte?: InputMaybe<Scalars['String']>;
  id_in?: InputMaybe<Array<Scalars['String']>>;
  id_not_in?: InputMaybe<Array<Scalars['String']>>;
  id_contains?: InputMaybe<Scalars['String']>;
  id_contains_nocase?: InputMaybe<Scalars['String']>;
  id_not_contains?: InputMaybe<Scalars['String']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  id_starts_with?: InputMaybe<Scalars['String']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_starts_with?: InputMaybe<Scalars['String']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_ends_with?: InputMaybe<Scalars['String']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_ends_with?: InputMaybe<Scalars['String']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx?: InputMaybe<Scalars['String']>;
  pooltx_not?: InputMaybe<Scalars['String']>;
  pooltx_gt?: InputMaybe<Scalars['String']>;
  pooltx_lt?: InputMaybe<Scalars['String']>;
  pooltx_gte?: InputMaybe<Scalars['String']>;
  pooltx_lte?: InputMaybe<Scalars['String']>;
  pooltx_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_not_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_contains?: InputMaybe<Scalars['String']>;
  pooltx_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_contains?: InputMaybe<Scalars['String']>;
  pooltx_not_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_?: InputMaybe<PoolTx_filter>;
  nullifier?: InputMaybe<Scalars['BigInt']>;
  nullifier_not?: InputMaybe<Scalars['BigInt']>;
  nullifier_gt?: InputMaybe<Scalars['BigInt']>;
  nullifier_lt?: InputMaybe<Scalars['BigInt']>;
  nullifier_gte?: InputMaybe<Scalars['BigInt']>;
  nullifier_lte?: InputMaybe<Scalars['BigInt']>;
  nullifier_in?: InputMaybe<Array<Scalars['BigInt']>>;
  nullifier_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  fee?: InputMaybe<Scalars['BigInt']>;
  fee_not?: InputMaybe<Scalars['BigInt']>;
  fee_gt?: InputMaybe<Scalars['BigInt']>;
  fee_lt?: InputMaybe<Scalars['BigInt']>;
  fee_gte?: InputMaybe<Scalars['BigInt']>;
  fee_lte?: InputMaybe<Scalars['BigInt']>;
  fee_in?: InputMaybe<Array<Scalars['BigInt']>>;
  fee_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<TransferOperation_filter>>>;
  or?: InputMaybe<Array<InputMaybe<TransferOperation_filter>>>;
};

export type TransferOperation_orderBy =
  | 'id'
  | 'pooltx'
  | 'pooltx__id'
  | 'pooltx__tx'
  | 'pooltx__ts'
  | 'pooltx__all_messages_hash'
  | 'pooltx__type'
  | 'pooltx__message'
  | 'pooltx__gas_used'
  | 'pooltx__calldata'
  | 'nullifier'
  | 'index'
  | 'fee';

export type WithdrawalOperation = Operation & {
  id: Scalars['String'];
  pooltx: PoolTx;
  nullifier: Scalars['BigInt'];
  index: Scalars['BigInt'];
  energy_amount: Scalars['BigInt'];
  token_amount: Scalars['BigInt'];
  fee: Scalars['BigInt'];
  native_amount: Scalars['BigInt'];
  receiver: Scalars['Bytes'];
};

export type WithdrawalOperation_filter = {
  id?: InputMaybe<Scalars['String']>;
  id_not?: InputMaybe<Scalars['String']>;
  id_gt?: InputMaybe<Scalars['String']>;
  id_lt?: InputMaybe<Scalars['String']>;
  id_gte?: InputMaybe<Scalars['String']>;
  id_lte?: InputMaybe<Scalars['String']>;
  id_in?: InputMaybe<Array<Scalars['String']>>;
  id_not_in?: InputMaybe<Array<Scalars['String']>>;
  id_contains?: InputMaybe<Scalars['String']>;
  id_contains_nocase?: InputMaybe<Scalars['String']>;
  id_not_contains?: InputMaybe<Scalars['String']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  id_starts_with?: InputMaybe<Scalars['String']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_starts_with?: InputMaybe<Scalars['String']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_ends_with?: InputMaybe<Scalars['String']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_ends_with?: InputMaybe<Scalars['String']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx?: InputMaybe<Scalars['String']>;
  pooltx_not?: InputMaybe<Scalars['String']>;
  pooltx_gt?: InputMaybe<Scalars['String']>;
  pooltx_lt?: InputMaybe<Scalars['String']>;
  pooltx_gte?: InputMaybe<Scalars['String']>;
  pooltx_lte?: InputMaybe<Scalars['String']>;
  pooltx_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_not_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_contains?: InputMaybe<Scalars['String']>;
  pooltx_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_contains?: InputMaybe<Scalars['String']>;
  pooltx_not_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_?: InputMaybe<PoolTx_filter>;
  nullifier?: InputMaybe<Scalars['BigInt']>;
  nullifier_not?: InputMaybe<Scalars['BigInt']>;
  nullifier_gt?: InputMaybe<Scalars['BigInt']>;
  nullifier_lt?: InputMaybe<Scalars['BigInt']>;
  nullifier_gte?: InputMaybe<Scalars['BigInt']>;
  nullifier_lte?: InputMaybe<Scalars['BigInt']>;
  nullifier_in?: InputMaybe<Array<Scalars['BigInt']>>;
  nullifier_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  energy_amount?: InputMaybe<Scalars['BigInt']>;
  energy_amount_not?: InputMaybe<Scalars['BigInt']>;
  energy_amount_gt?: InputMaybe<Scalars['BigInt']>;
  energy_amount_lt?: InputMaybe<Scalars['BigInt']>;
  energy_amount_gte?: InputMaybe<Scalars['BigInt']>;
  energy_amount_lte?: InputMaybe<Scalars['BigInt']>;
  energy_amount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  energy_amount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  token_amount?: InputMaybe<Scalars['BigInt']>;
  token_amount_not?: InputMaybe<Scalars['BigInt']>;
  token_amount_gt?: InputMaybe<Scalars['BigInt']>;
  token_amount_lt?: InputMaybe<Scalars['BigInt']>;
  token_amount_gte?: InputMaybe<Scalars['BigInt']>;
  token_amount_lte?: InputMaybe<Scalars['BigInt']>;
  token_amount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  token_amount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  fee?: InputMaybe<Scalars['BigInt']>;
  fee_not?: InputMaybe<Scalars['BigInt']>;
  fee_gt?: InputMaybe<Scalars['BigInt']>;
  fee_lt?: InputMaybe<Scalars['BigInt']>;
  fee_gte?: InputMaybe<Scalars['BigInt']>;
  fee_lte?: InputMaybe<Scalars['BigInt']>;
  fee_in?: InputMaybe<Array<Scalars['BigInt']>>;
  fee_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  native_amount?: InputMaybe<Scalars['BigInt']>;
  native_amount_not?: InputMaybe<Scalars['BigInt']>;
  native_amount_gt?: InputMaybe<Scalars['BigInt']>;
  native_amount_lt?: InputMaybe<Scalars['BigInt']>;
  native_amount_gte?: InputMaybe<Scalars['BigInt']>;
  native_amount_lte?: InputMaybe<Scalars['BigInt']>;
  native_amount_in?: InputMaybe<Array<Scalars['BigInt']>>;
  native_amount_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  receiver?: InputMaybe<Scalars['Bytes']>;
  receiver_not?: InputMaybe<Scalars['Bytes']>;
  receiver_gt?: InputMaybe<Scalars['Bytes']>;
  receiver_lt?: InputMaybe<Scalars['Bytes']>;
  receiver_gte?: InputMaybe<Scalars['Bytes']>;
  receiver_lte?: InputMaybe<Scalars['Bytes']>;
  receiver_in?: InputMaybe<Array<Scalars['Bytes']>>;
  receiver_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  receiver_contains?: InputMaybe<Scalars['Bytes']>;
  receiver_not_contains?: InputMaybe<Scalars['Bytes']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<WithdrawalOperation_filter>>>;
  or?: InputMaybe<Array<InputMaybe<WithdrawalOperation_filter>>>;
};

export type WithdrawalOperation_orderBy =
  | 'id'
  | 'pooltx'
  | 'pooltx__id'
  | 'pooltx__tx'
  | 'pooltx__ts'
  | 'pooltx__all_messages_hash'
  | 'pooltx__type'
  | 'pooltx__message'
  | 'pooltx__gas_used'
  | 'pooltx__calldata'
  | 'nullifier'
  | 'index'
  | 'energy_amount'
  | 'token_amount'
  | 'fee'
  | 'native_amount'
  | 'receiver';

export type ZkCommon = {
  id: Scalars['String'];
  pooltx: PoolTx;
  out_commit: Scalars['BigInt'];
  witness: Array<Scalars['BigInt']>;
  tree_root_after: Scalars['BigInt'];
  tree_proof: Array<Scalars['BigInt']>;
};

export type ZkCommon_filter = {
  id?: InputMaybe<Scalars['String']>;
  id_not?: InputMaybe<Scalars['String']>;
  id_gt?: InputMaybe<Scalars['String']>;
  id_lt?: InputMaybe<Scalars['String']>;
  id_gte?: InputMaybe<Scalars['String']>;
  id_lte?: InputMaybe<Scalars['String']>;
  id_in?: InputMaybe<Array<Scalars['String']>>;
  id_not_in?: InputMaybe<Array<Scalars['String']>>;
  id_contains?: InputMaybe<Scalars['String']>;
  id_contains_nocase?: InputMaybe<Scalars['String']>;
  id_not_contains?: InputMaybe<Scalars['String']>;
  id_not_contains_nocase?: InputMaybe<Scalars['String']>;
  id_starts_with?: InputMaybe<Scalars['String']>;
  id_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_starts_with?: InputMaybe<Scalars['String']>;
  id_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  id_ends_with?: InputMaybe<Scalars['String']>;
  id_ends_with_nocase?: InputMaybe<Scalars['String']>;
  id_not_ends_with?: InputMaybe<Scalars['String']>;
  id_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx?: InputMaybe<Scalars['String']>;
  pooltx_not?: InputMaybe<Scalars['String']>;
  pooltx_gt?: InputMaybe<Scalars['String']>;
  pooltx_lt?: InputMaybe<Scalars['String']>;
  pooltx_gte?: InputMaybe<Scalars['String']>;
  pooltx_lte?: InputMaybe<Scalars['String']>;
  pooltx_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_not_in?: InputMaybe<Array<Scalars['String']>>;
  pooltx_contains?: InputMaybe<Scalars['String']>;
  pooltx_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_contains?: InputMaybe<Scalars['String']>;
  pooltx_not_contains_nocase?: InputMaybe<Scalars['String']>;
  pooltx_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with?: InputMaybe<Scalars['String']>;
  pooltx_not_starts_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with?: InputMaybe<Scalars['String']>;
  pooltx_not_ends_with_nocase?: InputMaybe<Scalars['String']>;
  pooltx_?: InputMaybe<PoolTx_filter>;
  out_commit?: InputMaybe<Scalars['BigInt']>;
  out_commit_not?: InputMaybe<Scalars['BigInt']>;
  out_commit_gt?: InputMaybe<Scalars['BigInt']>;
  out_commit_lt?: InputMaybe<Scalars['BigInt']>;
  out_commit_gte?: InputMaybe<Scalars['BigInt']>;
  out_commit_lte?: InputMaybe<Scalars['BigInt']>;
  out_commit_in?: InputMaybe<Array<Scalars['BigInt']>>;
  out_commit_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  witness?: InputMaybe<Array<Scalars['BigInt']>>;
  witness_not?: InputMaybe<Array<Scalars['BigInt']>>;
  witness_contains?: InputMaybe<Array<Scalars['BigInt']>>;
  witness_contains_nocase?: InputMaybe<Array<Scalars['BigInt']>>;
  witness_not_contains?: InputMaybe<Array<Scalars['BigInt']>>;
  witness_not_contains_nocase?: InputMaybe<Array<Scalars['BigInt']>>;
  tree_root_after?: InputMaybe<Scalars['BigInt']>;
  tree_root_after_not?: InputMaybe<Scalars['BigInt']>;
  tree_root_after_gt?: InputMaybe<Scalars['BigInt']>;
  tree_root_after_lt?: InputMaybe<Scalars['BigInt']>;
  tree_root_after_gte?: InputMaybe<Scalars['BigInt']>;
  tree_root_after_lte?: InputMaybe<Scalars['BigInt']>;
  tree_root_after_in?: InputMaybe<Array<Scalars['BigInt']>>;
  tree_root_after_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  tree_proof?: InputMaybe<Array<Scalars['BigInt']>>;
  tree_proof_not?: InputMaybe<Array<Scalars['BigInt']>>;
  tree_proof_contains?: InputMaybe<Array<Scalars['BigInt']>>;
  tree_proof_contains_nocase?: InputMaybe<Array<Scalars['BigInt']>>;
  tree_proof_not_contains?: InputMaybe<Array<Scalars['BigInt']>>;
  tree_proof_not_contains_nocase?: InputMaybe<Array<Scalars['BigInt']>>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<ZkCommon_filter>>>;
  or?: InputMaybe<Array<InputMaybe<ZkCommon_filter>>>;
};

export type ZkCommon_orderBy =
  | 'id'
  | 'pooltx'
  | 'pooltx__id'
  | 'pooltx__tx'
  | 'pooltx__ts'
  | 'pooltx__all_messages_hash'
  | 'pooltx__type'
  | 'pooltx__message'
  | 'pooltx__gas_used'
  | 'pooltx__calldata'
  | 'out_commit'
  | 'witness'
  | 'tree_root_after'
  | 'tree_proof';

export type _Block_ = {
  /** The hash of the block */
  hash?: Maybe<Scalars['Bytes']>;
  /** The block number */
  number: Scalars['Int'];
  /** Integer representation of the timestamp stored in blocks for the chain */
  timestamp?: Maybe<Scalars['Int']>;
};

/** The type for the top-level _meta field */
export type _Meta_ = {
  /**
   * Information about a specific subgraph block. The hash of the block
   * will be null if the _meta field has a block constraint that asks for
   * a block number. It will be filled if the _meta field has no block constraint
   * and therefore asks for the latest  block
   *
   */
  block: _Block_;
  /** The deployment ID */
  deployment: Scalars['String'];
  /** If `true`, the subgraph encountered indexing errors at some past block */
  hasIndexingErrors: Scalars['Boolean'];
};

export type _SubgraphErrorPolicy_ =
  /** Data will be returned even if the subgraph has indexing errors */
  | 'allow'
  /** If the subgraph has indexing errors, data will be omitted. The default. */
  | 'deny';

  export type QuerySdk = {
      /** null **/
  directDeposit: InContextSdkMethod<Query['directDeposit'], QuerydirectDepositArgs, MeshContext>,
  /** null **/
  directDeposits: InContextSdkMethod<Query['directDeposits'], QuerydirectDepositsArgs, MeshContext>,
  /** null **/
  payment: InContextSdkMethod<Query['payment'], QuerypaymentArgs, MeshContext>,
  /** null **/
  payments: InContextSdkMethod<Query['payments'], QuerypaymentsArgs, MeshContext>,
  /** null **/
  zkCommon: InContextSdkMethod<Query['zkCommon'], QueryzkCommonArgs, MeshContext>,
  /** null **/
  zkCommons: InContextSdkMethod<Query['zkCommons'], QueryzkCommonsArgs, MeshContext>,
  /** null **/
  depositOperation: InContextSdkMethod<Query['depositOperation'], QuerydepositOperationArgs, MeshContext>,
  /** null **/
  depositOperations: InContextSdkMethod<Query['depositOperations'], QuerydepositOperationsArgs, MeshContext>,
  /** null **/
  transferOperation: InContextSdkMethod<Query['transferOperation'], QuerytransferOperationArgs, MeshContext>,
  /** null **/
  transferOperations: InContextSdkMethod<Query['transferOperations'], QuerytransferOperationsArgs, MeshContext>,
  /** null **/
  withdrawalOperation: InContextSdkMethod<Query['withdrawalOperation'], QuerywithdrawalOperationArgs, MeshContext>,
  /** null **/
  withdrawalOperations: InContextSdkMethod<Query['withdrawalOperations'], QuerywithdrawalOperationsArgs, MeshContext>,
  /** null **/
  permittableDepositOperation: InContextSdkMethod<Query['permittableDepositOperation'], QuerypermittableDepositOperationArgs, MeshContext>,
  /** null **/
  permittableDepositOperations: InContextSdkMethod<Query['permittableDepositOperations'], QuerypermittableDepositOperationsArgs, MeshContext>,
  /** null **/
  ddbatchOperation: InContextSdkMethod<Query['ddbatchOperation'], QueryddbatchOperationArgs, MeshContext>,
  /** null **/
  ddbatchOperations: InContextSdkMethod<Query['ddbatchOperations'], QueryddbatchOperationsArgs, MeshContext>,
  /** null **/
  poolTx: InContextSdkMethod<Query['poolTx'], QuerypoolTxArgs, MeshContext>,
  /** null **/
  poolTxes: InContextSdkMethod<Query['poolTxes'], QuerypoolTxesArgs, MeshContext>,
  /** null **/
  lastSyncBlock: InContextSdkMethod<Query['lastSyncBlock'], QuerylastSyncBlockArgs, MeshContext>,
  /** null **/
  lastSyncBlocks: InContextSdkMethod<Query['lastSyncBlocks'], QuerylastSyncBlocksArgs, MeshContext>,
  /** null **/
  operation: InContextSdkMethod<Query['operation'], QueryoperationArgs, MeshContext>,
  /** null **/
  operations: InContextSdkMethod<Query['operations'], QueryoperationsArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Query['_meta'], Query_metaArgs, MeshContext>
  };

  export type MutationSdk = {
    
  };

  export type SubscriptionSdk = {
      /** null **/
  directDeposit: InContextSdkMethod<Subscription['directDeposit'], SubscriptiondirectDepositArgs, MeshContext>,
  /** null **/
  directDeposits: InContextSdkMethod<Subscription['directDeposits'], SubscriptiondirectDepositsArgs, MeshContext>,
  /** null **/
  payment: InContextSdkMethod<Subscription['payment'], SubscriptionpaymentArgs, MeshContext>,
  /** null **/
  payments: InContextSdkMethod<Subscription['payments'], SubscriptionpaymentsArgs, MeshContext>,
  /** null **/
  zkCommon: InContextSdkMethod<Subscription['zkCommon'], SubscriptionzkCommonArgs, MeshContext>,
  /** null **/
  zkCommons: InContextSdkMethod<Subscription['zkCommons'], SubscriptionzkCommonsArgs, MeshContext>,
  /** null **/
  depositOperation: InContextSdkMethod<Subscription['depositOperation'], SubscriptiondepositOperationArgs, MeshContext>,
  /** null **/
  depositOperations: InContextSdkMethod<Subscription['depositOperations'], SubscriptiondepositOperationsArgs, MeshContext>,
  /** null **/
  transferOperation: InContextSdkMethod<Subscription['transferOperation'], SubscriptiontransferOperationArgs, MeshContext>,
  /** null **/
  transferOperations: InContextSdkMethod<Subscription['transferOperations'], SubscriptiontransferOperationsArgs, MeshContext>,
  /** null **/
  withdrawalOperation: InContextSdkMethod<Subscription['withdrawalOperation'], SubscriptionwithdrawalOperationArgs, MeshContext>,
  /** null **/
  withdrawalOperations: InContextSdkMethod<Subscription['withdrawalOperations'], SubscriptionwithdrawalOperationsArgs, MeshContext>,
  /** null **/
  permittableDepositOperation: InContextSdkMethod<Subscription['permittableDepositOperation'], SubscriptionpermittableDepositOperationArgs, MeshContext>,
  /** null **/
  permittableDepositOperations: InContextSdkMethod<Subscription['permittableDepositOperations'], SubscriptionpermittableDepositOperationsArgs, MeshContext>,
  /** null **/
  ddbatchOperation: InContextSdkMethod<Subscription['ddbatchOperation'], SubscriptionddbatchOperationArgs, MeshContext>,
  /** null **/
  ddbatchOperations: InContextSdkMethod<Subscription['ddbatchOperations'], SubscriptionddbatchOperationsArgs, MeshContext>,
  /** null **/
  poolTx: InContextSdkMethod<Subscription['poolTx'], SubscriptionpoolTxArgs, MeshContext>,
  /** null **/
  poolTxes: InContextSdkMethod<Subscription['poolTxes'], SubscriptionpoolTxesArgs, MeshContext>,
  /** null **/
  lastSyncBlock: InContextSdkMethod<Subscription['lastSyncBlock'], SubscriptionlastSyncBlockArgs, MeshContext>,
  /** null **/
  lastSyncBlocks: InContextSdkMethod<Subscription['lastSyncBlocks'], SubscriptionlastSyncBlocksArgs, MeshContext>,
  /** null **/
  operation: InContextSdkMethod<Subscription['operation'], SubscriptionoperationArgs, MeshContext>,
  /** null **/
  operations: InContextSdkMethod<Subscription['operations'], SubscriptionoperationsArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Subscription['_meta'], Subscription_metaArgs, MeshContext>
  };

  export type Context = {
      ["zkbob-bob-goerli"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      ["subgraphEndpoint"]: Scalars['ID']
    };
}
