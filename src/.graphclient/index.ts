// @ts-nocheck
import { GraphQLResolveInfo, SelectionSetNode, FieldNode, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
import { gql } from '@graphql-mesh/utils';

import type { GetMeshOptions } from '@graphql-mesh/runtime';
import type { YamlConfig } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { DefaultLogger } from '@graphql-mesh/utils';
import MeshCache from "@graphql-mesh/cache-localforage";
import { fetch as fetchFn } from '@whatwg-node/fetch';

import { MeshResolvedSource } from '@graphql-mesh/runtime';
import { MeshTransform, MeshPlugin } from '@graphql-mesh/types';
import GraphqlHandler from "@graphql-mesh/graphql"
import { parse } from 'graphql';
import BareMerger from "@graphql-mesh/merger-bare";
import { printWithCache } from '@graphql-mesh/utils';
import { createMeshHTTPHandler, MeshHTTPHandler } from '@graphql-mesh/http';
import { getMesh, ExecuteMeshFn, SubscribeMeshFn, MeshContext as BaseMeshContext, MeshInstance } from '@graphql-mesh/runtime';
import { MeshStore, FsStoreStorageAdapter } from '@graphql-mesh/store';
import { path as pathModule } from '@graphql-mesh/cross-helpers';
import { ImportFn } from '@graphql-mesh/types';
import type { ZkbobBobGoerliTypes } from './sources/zkbob-bob-goerli/types';
import * as importedModule$0 from "./sources/zkbob-bob-goerli/introspectionSchema";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };



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
  subgraphEndpoint: Scalars['String'];
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

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
  selectionSet: string | ((fieldNode: FieldNode) => SelectionSetNode);
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type StitchingResolver<TResult, TParent, TContext, TArgs> = LegacyStitchingResolver<TResult, TParent, TContext, TArgs> | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Query: ResolverTypeWrapper<{}>;
  Subscription: ResolverTypeWrapper<{}>;
  BigDecimal: ResolverTypeWrapper<Scalars['BigDecimal']>;
  BigInt: ResolverTypeWrapper<Scalars['BigInt']>;
  BlockChangedFilter: BlockChangedFilter;
  Block_height: Block_height;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
  Bytes: ResolverTypeWrapper<Scalars['Bytes']>;
  DDBatchOperation: ResolverTypeWrapper<DDBatchOperation>;
  DDBatchOperation_filter: DDBatchOperation_filter;
  DDBatchOperation_orderBy: DDBatchOperation_orderBy;
  DepositOperation: ResolverTypeWrapper<DepositOperation>;
  DepositOperation_filter: DepositOperation_filter;
  DepositOperation_orderBy: DepositOperation_orderBy;
  DirectDeposit: ResolverTypeWrapper<DirectDeposit>;
  DirectDeposit_filter: DirectDeposit_filter;
  DirectDeposit_orderBy: DirectDeposit_orderBy;
  Float: ResolverTypeWrapper<Scalars['Float']>;
  ID: ResolverTypeWrapper<Scalars['ID']>;
  Int: ResolverTypeWrapper<Scalars['Int']>;
  Int8: ResolverTypeWrapper<Scalars['Int8']>;
  LastSyncBlock: ResolverTypeWrapper<LastSyncBlock>;
  LastSyncBlock_filter: LastSyncBlock_filter;
  LastSyncBlock_orderBy: LastSyncBlock_orderBy;
  Operation: ResolversTypes['DDBatchOperation'] | ResolversTypes['DepositOperation'] | ResolversTypes['PermittableDepositOperation'] | ResolversTypes['TransferOperation'] | ResolversTypes['WithdrawalOperation'];
  Operation_filter: Operation_filter;
  Operation_orderBy: Operation_orderBy;
  OrderDirection: OrderDirection;
  Payment: ResolverTypeWrapper<Payment>;
  Payment_filter: Payment_filter;
  Payment_orderBy: Payment_orderBy;
  PermittableDepositOperation: ResolverTypeWrapper<PermittableDepositOperation>;
  PermittableDepositOperation_filter: PermittableDepositOperation_filter;
  PermittableDepositOperation_orderBy: PermittableDepositOperation_orderBy;
  PoolTx: ResolverTypeWrapper<PoolTx>;
  PoolTx_filter: PoolTx_filter;
  PoolTx_orderBy: PoolTx_orderBy;
  String: ResolverTypeWrapper<Scalars['String']>;
  TransferOperation: ResolverTypeWrapper<TransferOperation>;
  TransferOperation_filter: TransferOperation_filter;
  TransferOperation_orderBy: TransferOperation_orderBy;
  WithdrawalOperation: ResolverTypeWrapper<WithdrawalOperation>;
  WithdrawalOperation_filter: WithdrawalOperation_filter;
  WithdrawalOperation_orderBy: WithdrawalOperation_orderBy;
  ZkCommon: ResolverTypeWrapper<ZkCommon>;
  ZkCommon_filter: ZkCommon_filter;
  ZkCommon_orderBy: ZkCommon_orderBy;
  _Block_: ResolverTypeWrapper<_Block_>;
  _Meta_: ResolverTypeWrapper<_Meta_>;
  _SubgraphErrorPolicy_: _SubgraphErrorPolicy_;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Query: {};
  Subscription: {};
  BigDecimal: Scalars['BigDecimal'];
  BigInt: Scalars['BigInt'];
  BlockChangedFilter: BlockChangedFilter;
  Block_height: Block_height;
  Boolean: Scalars['Boolean'];
  Bytes: Scalars['Bytes'];
  DDBatchOperation: DDBatchOperation;
  DDBatchOperation_filter: DDBatchOperation_filter;
  DepositOperation: DepositOperation;
  DepositOperation_filter: DepositOperation_filter;
  DirectDeposit: DirectDeposit;
  DirectDeposit_filter: DirectDeposit_filter;
  Float: Scalars['Float'];
  ID: Scalars['ID'];
  Int: Scalars['Int'];
  Int8: Scalars['Int8'];
  LastSyncBlock: LastSyncBlock;
  LastSyncBlock_filter: LastSyncBlock_filter;
  Operation: ResolversParentTypes['DDBatchOperation'] | ResolversParentTypes['DepositOperation'] | ResolversParentTypes['PermittableDepositOperation'] | ResolversParentTypes['TransferOperation'] | ResolversParentTypes['WithdrawalOperation'];
  Operation_filter: Operation_filter;
  Payment: Payment;
  Payment_filter: Payment_filter;
  PermittableDepositOperation: PermittableDepositOperation;
  PermittableDepositOperation_filter: PermittableDepositOperation_filter;
  PoolTx: PoolTx;
  PoolTx_filter: PoolTx_filter;
  String: Scalars['String'];
  TransferOperation: TransferOperation;
  TransferOperation_filter: TransferOperation_filter;
  WithdrawalOperation: WithdrawalOperation;
  WithdrawalOperation_filter: WithdrawalOperation_filter;
  ZkCommon: ZkCommon;
  ZkCommon_filter: ZkCommon_filter;
  _Block_: _Block_;
  _Meta_: _Meta_;
}>;

export type entityDirectiveArgs = { };

export type entityDirectiveResolver<Result, Parent, ContextType = MeshContext & { subgraphEndpoint: string }, Args = entityDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type subgraphIdDirectiveArgs = {
  id: Scalars['String'];
};

export type subgraphIdDirectiveResolver<Result, Parent, ContextType = MeshContext & { subgraphEndpoint: string }, Args = subgraphIdDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type derivedFromDirectiveArgs = {
  field: Scalars['String'];
};

export type derivedFromDirectiveResolver<Result, Parent, ContextType = MeshContext & { subgraphEndpoint: string }, Args = derivedFromDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type QueryResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  directDeposit?: Resolver<Maybe<ResolversTypes['DirectDeposit']>, ParentType, ContextType, RequireFields<QuerydirectDepositArgs, 'id' | 'subgraphError'>>;
  directDeposits?: Resolver<Array<ResolversTypes['DirectDeposit']>, ParentType, ContextType, RequireFields<QuerydirectDepositsArgs, 'skip' | 'first' | 'subgraphError'>>;
  payment?: Resolver<Maybe<ResolversTypes['Payment']>, ParentType, ContextType, RequireFields<QuerypaymentArgs, 'id' | 'subgraphError'>>;
  payments?: Resolver<Array<ResolversTypes['Payment']>, ParentType, ContextType, RequireFields<QuerypaymentsArgs, 'skip' | 'first' | 'subgraphError'>>;
  zkCommon?: Resolver<Maybe<ResolversTypes['ZkCommon']>, ParentType, ContextType, RequireFields<QueryzkCommonArgs, 'id' | 'subgraphError'>>;
  zkCommons?: Resolver<Array<ResolversTypes['ZkCommon']>, ParentType, ContextType, RequireFields<QueryzkCommonsArgs, 'skip' | 'first' | 'subgraphError'>>;
  depositOperation?: Resolver<Maybe<ResolversTypes['DepositOperation']>, ParentType, ContextType, RequireFields<QuerydepositOperationArgs, 'id' | 'subgraphError'>>;
  depositOperations?: Resolver<Array<ResolversTypes['DepositOperation']>, ParentType, ContextType, RequireFields<QuerydepositOperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  transferOperation?: Resolver<Maybe<ResolversTypes['TransferOperation']>, ParentType, ContextType, RequireFields<QuerytransferOperationArgs, 'id' | 'subgraphError'>>;
  transferOperations?: Resolver<Array<ResolversTypes['TransferOperation']>, ParentType, ContextType, RequireFields<QuerytransferOperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  withdrawalOperation?: Resolver<Maybe<ResolversTypes['WithdrawalOperation']>, ParentType, ContextType, RequireFields<QuerywithdrawalOperationArgs, 'id' | 'subgraphError'>>;
  withdrawalOperations?: Resolver<Array<ResolversTypes['WithdrawalOperation']>, ParentType, ContextType, RequireFields<QuerywithdrawalOperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  permittableDepositOperation?: Resolver<Maybe<ResolversTypes['PermittableDepositOperation']>, ParentType, ContextType, RequireFields<QuerypermittableDepositOperationArgs, 'id' | 'subgraphError'>>;
  permittableDepositOperations?: Resolver<Array<ResolversTypes['PermittableDepositOperation']>, ParentType, ContextType, RequireFields<QuerypermittableDepositOperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  ddbatchOperation?: Resolver<Maybe<ResolversTypes['DDBatchOperation']>, ParentType, ContextType, RequireFields<QueryddbatchOperationArgs, 'id' | 'subgraphError'>>;
  ddbatchOperations?: Resolver<Array<ResolversTypes['DDBatchOperation']>, ParentType, ContextType, RequireFields<QueryddbatchOperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  poolTx?: Resolver<Maybe<ResolversTypes['PoolTx']>, ParentType, ContextType, RequireFields<QuerypoolTxArgs, 'id' | 'subgraphError'>>;
  poolTxes?: Resolver<Array<ResolversTypes['PoolTx']>, ParentType, ContextType, RequireFields<QuerypoolTxesArgs, 'skip' | 'first' | 'subgraphError'>>;
  lastSyncBlock?: Resolver<Maybe<ResolversTypes['LastSyncBlock']>, ParentType, ContextType, RequireFields<QuerylastSyncBlockArgs, 'id' | 'subgraphError'>>;
  lastSyncBlocks?: Resolver<Array<ResolversTypes['LastSyncBlock']>, ParentType, ContextType, RequireFields<QuerylastSyncBlocksArgs, 'skip' | 'first' | 'subgraphError'>>;
  operation?: Resolver<Maybe<ResolversTypes['Operation']>, ParentType, ContextType, RequireFields<QueryoperationArgs, 'id' | 'subgraphError'>>;
  operations?: Resolver<Array<ResolversTypes['Operation']>, ParentType, ContextType, RequireFields<QueryoperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  _meta?: Resolver<Maybe<ResolversTypes['_Meta_']>, ParentType, ContextType, Partial<Query_metaArgs>>;
}>;

export type SubscriptionResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  directDeposit?: SubscriptionResolver<Maybe<ResolversTypes['DirectDeposit']>, "directDeposit", ParentType, ContextType, RequireFields<SubscriptiondirectDepositArgs, 'id' | 'subgraphError'>>;
  directDeposits?: SubscriptionResolver<Array<ResolversTypes['DirectDeposit']>, "directDeposits", ParentType, ContextType, RequireFields<SubscriptiondirectDepositsArgs, 'skip' | 'first' | 'subgraphError'>>;
  payment?: SubscriptionResolver<Maybe<ResolversTypes['Payment']>, "payment", ParentType, ContextType, RequireFields<SubscriptionpaymentArgs, 'id' | 'subgraphError'>>;
  payments?: SubscriptionResolver<Array<ResolversTypes['Payment']>, "payments", ParentType, ContextType, RequireFields<SubscriptionpaymentsArgs, 'skip' | 'first' | 'subgraphError'>>;
  zkCommon?: SubscriptionResolver<Maybe<ResolversTypes['ZkCommon']>, "zkCommon", ParentType, ContextType, RequireFields<SubscriptionzkCommonArgs, 'id' | 'subgraphError'>>;
  zkCommons?: SubscriptionResolver<Array<ResolversTypes['ZkCommon']>, "zkCommons", ParentType, ContextType, RequireFields<SubscriptionzkCommonsArgs, 'skip' | 'first' | 'subgraphError'>>;
  depositOperation?: SubscriptionResolver<Maybe<ResolversTypes['DepositOperation']>, "depositOperation", ParentType, ContextType, RequireFields<SubscriptiondepositOperationArgs, 'id' | 'subgraphError'>>;
  depositOperations?: SubscriptionResolver<Array<ResolversTypes['DepositOperation']>, "depositOperations", ParentType, ContextType, RequireFields<SubscriptiondepositOperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  transferOperation?: SubscriptionResolver<Maybe<ResolversTypes['TransferOperation']>, "transferOperation", ParentType, ContextType, RequireFields<SubscriptiontransferOperationArgs, 'id' | 'subgraphError'>>;
  transferOperations?: SubscriptionResolver<Array<ResolversTypes['TransferOperation']>, "transferOperations", ParentType, ContextType, RequireFields<SubscriptiontransferOperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  withdrawalOperation?: SubscriptionResolver<Maybe<ResolversTypes['WithdrawalOperation']>, "withdrawalOperation", ParentType, ContextType, RequireFields<SubscriptionwithdrawalOperationArgs, 'id' | 'subgraphError'>>;
  withdrawalOperations?: SubscriptionResolver<Array<ResolversTypes['WithdrawalOperation']>, "withdrawalOperations", ParentType, ContextType, RequireFields<SubscriptionwithdrawalOperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  permittableDepositOperation?: SubscriptionResolver<Maybe<ResolversTypes['PermittableDepositOperation']>, "permittableDepositOperation", ParentType, ContextType, RequireFields<SubscriptionpermittableDepositOperationArgs, 'id' | 'subgraphError'>>;
  permittableDepositOperations?: SubscriptionResolver<Array<ResolversTypes['PermittableDepositOperation']>, "permittableDepositOperations", ParentType, ContextType, RequireFields<SubscriptionpermittableDepositOperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  ddbatchOperation?: SubscriptionResolver<Maybe<ResolversTypes['DDBatchOperation']>, "ddbatchOperation", ParentType, ContextType, RequireFields<SubscriptionddbatchOperationArgs, 'id' | 'subgraphError'>>;
  ddbatchOperations?: SubscriptionResolver<Array<ResolversTypes['DDBatchOperation']>, "ddbatchOperations", ParentType, ContextType, RequireFields<SubscriptionddbatchOperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  poolTx?: SubscriptionResolver<Maybe<ResolversTypes['PoolTx']>, "poolTx", ParentType, ContextType, RequireFields<SubscriptionpoolTxArgs, 'id' | 'subgraphError'>>;
  poolTxes?: SubscriptionResolver<Array<ResolversTypes['PoolTx']>, "poolTxes", ParentType, ContextType, RequireFields<SubscriptionpoolTxesArgs, 'skip' | 'first' | 'subgraphError'>>;
  lastSyncBlock?: SubscriptionResolver<Maybe<ResolversTypes['LastSyncBlock']>, "lastSyncBlock", ParentType, ContextType, RequireFields<SubscriptionlastSyncBlockArgs, 'id' | 'subgraphError'>>;
  lastSyncBlocks?: SubscriptionResolver<Array<ResolversTypes['LastSyncBlock']>, "lastSyncBlocks", ParentType, ContextType, RequireFields<SubscriptionlastSyncBlocksArgs, 'skip' | 'first' | 'subgraphError'>>;
  operation?: SubscriptionResolver<Maybe<ResolversTypes['Operation']>, "operation", ParentType, ContextType, RequireFields<SubscriptionoperationArgs, 'id' | 'subgraphError'>>;
  operations?: SubscriptionResolver<Array<ResolversTypes['Operation']>, "operations", ParentType, ContextType, RequireFields<SubscriptionoperationsArgs, 'skip' | 'first' | 'subgraphError'>>;
  _meta?: SubscriptionResolver<Maybe<ResolversTypes['_Meta_']>, "_meta", ParentType, ContextType, Partial<Subscription_metaArgs>>;
}>;

export interface BigDecimalScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigDecimal'], any> {
  name: 'BigDecimal';
}

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export interface BytesScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Bytes'], any> {
  name: 'Bytes';
}

export type DDBatchOperationResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['DDBatchOperation'] = ResolversParentTypes['DDBatchOperation']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pooltx?: Resolver<ResolversTypes['PoolTx'], ParentType, ContextType>;
  delegated_deposits?: Resolver<Array<ResolversTypes['DirectDeposit']>, ParentType, ContextType, RequireFields<DDBatchOperationdelegated_depositsArgs, 'skip' | 'first'>>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DepositOperationResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['DepositOperation'] = ResolversParentTypes['DepositOperation']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pooltx?: Resolver<ResolversTypes['PoolTx'], ParentType, ContextType>;
  nullifier?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  token_amount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  fee?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type DirectDepositResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['DirectDeposit'] = ResolversParentTypes['DirectDeposit']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  pending?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  completed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  refunded?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sender?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  fallbackUser?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  zkAddress_diversifier?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  zkAddress_pk?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  deposit?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  fee?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  bnInit?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  tsInit?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  txInit?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  payment?: Resolver<Maybe<ResolversTypes['Payment']>, ParentType, ContextType>;
  bnClosed?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  tsClosed?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  txClosed?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  subgraphEndpoint?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface Int8ScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Int8'], any> {
  name: 'Int8';
}

export type LastSyncBlockResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['LastSyncBlock'] = ResolversParentTypes['LastSyncBlock']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  block?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OperationResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['Operation'] = ResolversParentTypes['Operation']> = ResolversObject<{
  __resolveType: TypeResolveFn<'DDBatchOperation' | 'DepositOperation' | 'PermittableDepositOperation' | 'TransferOperation' | 'WithdrawalOperation', ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pooltx?: Resolver<ResolversTypes['PoolTx'], ParentType, ContextType>;
}>;

export type PaymentResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['Payment'] = ResolversParentTypes['Payment']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sender?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  delegated_deposit?: Resolver<ResolversTypes['DirectDeposit'], ParentType, ContextType>;
  token?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  note?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PermittableDepositOperationResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['PermittableDepositOperation'] = ResolversParentTypes['PermittableDepositOperation']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pooltx?: Resolver<ResolversTypes['PoolTx'], ParentType, ContextType>;
  nullifier?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  token_amount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  fee?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  permit_deadline?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  permit_holder?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  sig?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type PoolTxResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['PoolTx'] = ResolversParentTypes['PoolTx']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tx?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  ts?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  all_messages_hash?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  gas_used?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  zk?: Resolver<ResolversTypes['ZkCommon'], ParentType, ContextType>;
  operation?: Resolver<ResolversTypes['Operation'], ParentType, ContextType>;
  calldata?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TransferOperationResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['TransferOperation'] = ResolversParentTypes['TransferOperation']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pooltx?: Resolver<ResolversTypes['PoolTx'], ParentType, ContextType>;
  nullifier?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  fee?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WithdrawalOperationResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['WithdrawalOperation'] = ResolversParentTypes['WithdrawalOperation']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pooltx?: Resolver<ResolversTypes['PoolTx'], ParentType, ContextType>;
  nullifier?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  energy_amount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  token_amount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  fee?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  native_amount?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  receiver?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ZkCommonResolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['ZkCommon'] = ResolversParentTypes['ZkCommon']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pooltx?: Resolver<ResolversTypes['PoolTx'], ParentType, ContextType>;
  out_commit?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  witness?: Resolver<Array<ResolversTypes['BigInt']>, ParentType, ContextType>;
  tree_root_after?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  tree_proof?: Resolver<Array<ResolversTypes['BigInt']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type _Block_Resolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['_Block_'] = ResolversParentTypes['_Block_']> = ResolversObject<{
  hash?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  number?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type _Meta_Resolvers<ContextType = MeshContext & { subgraphEndpoint: string }, ParentType extends ResolversParentTypes['_Meta_'] = ResolversParentTypes['_Meta_']> = ResolversObject<{
  block?: Resolver<ResolversTypes['_Block_'], ParentType, ContextType>;
  deployment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  hasIndexingErrors?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = MeshContext & { subgraphEndpoint: string }> = ResolversObject<{
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  BigDecimal?: GraphQLScalarType;
  BigInt?: GraphQLScalarType;
  Bytes?: GraphQLScalarType;
  DDBatchOperation?: DDBatchOperationResolvers<ContextType>;
  DepositOperation?: DepositOperationResolvers<ContextType>;
  DirectDeposit?: DirectDepositResolvers<ContextType>;
  Int8?: GraphQLScalarType;
  LastSyncBlock?: LastSyncBlockResolvers<ContextType>;
  Operation?: OperationResolvers<ContextType>;
  Payment?: PaymentResolvers<ContextType>;
  PermittableDepositOperation?: PermittableDepositOperationResolvers<ContextType>;
  PoolTx?: PoolTxResolvers<ContextType>;
  TransferOperation?: TransferOperationResolvers<ContextType>;
  WithdrawalOperation?: WithdrawalOperationResolvers<ContextType>;
  ZkCommon?: ZkCommonResolvers<ContextType>;
  _Block_?: _Block_Resolvers<ContextType>;
  _Meta_?: _Meta_Resolvers<ContextType>;
}>;

export type DirectiveResolvers<ContextType = MeshContext & { subgraphEndpoint: string }> = ResolversObject<{
  entity?: entityDirectiveResolver<any, any, ContextType>;
  subgraphId?: subgraphIdDirectiveResolver<any, any, ContextType>;
  derivedFrom?: derivedFromDirectiveResolver<any, any, ContextType>;
}>;

export type MeshContext = ZkbobBobGoerliTypes.Context & BaseMeshContext;


import { fileURLToPath } from '@graphql-mesh/utils';
const baseDir = pathModule.join(pathModule.dirname(fileURLToPath(import.meta.url)), '..');

const importFn: ImportFn = <T>(moduleId: string) => {
  const relativeModuleId = (pathModule.isAbsolute(moduleId) ? pathModule.relative(baseDir, moduleId) : moduleId).split('\\').join('/').replace(baseDir + '/', '');
  switch(relativeModuleId) {
    case ".graphclient/sources/zkbob-bob-goerli/introspectionSchema":
      return Promise.resolve(importedModule$0) as T;
    
    default:
      return Promise.reject(new Error(`Cannot find module '${relativeModuleId}'.`));
  }
};

const rootStore = new MeshStore('.graphclient', new FsStoreStorageAdapter({
  cwd: baseDir,
  importFn,
  fileType: "ts",
}), {
  readonly: true,
  validate: false
});

export const rawServeConfig: YamlConfig.Config['serve'] = undefined as any
export async function getMeshOptions(): Promise<GetMeshOptions> {
const pubsub = new PubSub();
const sourcesStore = rootStore.child('sources');
const logger = new DefaultLogger("GraphClient");
const cache = new (MeshCache as any)({
      ...({} as any),
      importFn,
      store: rootStore.child('cache'),
      pubsub,
      logger,
    } as any)

const sources: MeshResolvedSource[] = [];
const transforms: MeshTransform[] = [];
const additionalEnvelopPlugins: MeshPlugin<any>[] = [];
const zkbobBobGoerliTransforms = [];
const zkbobBobGoerliHandler = new GraphqlHandler({
              name: "zkbob-bob-goerli",
              config: {"endpoint":"{context.subgraphEndpoint:https://api.thegraph.com/subgraphs/name/zkbob/zkbob-bob-goerli}"},
              baseDir,
              cache,
              pubsub,
              store: sourcesStore.child("zkbob-bob-goerli"),
              logger: logger.child("zkbob-bob-goerli"),
              importFn,
            });
sources[0] = {
          name: 'zkbob-bob-goerli',
          handler: zkbobBobGoerliHandler,
          transforms: zkbobBobGoerliTransforms
        }
const additionalTypeDefs = [parse("extend type DirectDeposit {\n  subgraphEndpoint: String!\n}"),] as any[];
const additionalResolvers = await Promise.all([
        import("../dd/dd-resolvers")
            .then(m => m.resolvers || m.default || m)
      ]);
const merger = new(BareMerger as any)({
        cache,
        pubsub,
        logger: logger.child('bareMerger'),
        store: rootStore.child('bareMerger')
      })

  return {
    sources,
    transforms,
    additionalTypeDefs,
    additionalResolvers,
    cache,
    pubsub,
    merger,
    logger,
    additionalEnvelopPlugins,
    get documents() {
      return [
      {
        document: PendingDirectDepositsDocument,
        get rawSDL() {
          return printWithCache(PendingDirectDepositsDocument);
        },
        location: 'PendingDirectDepositsDocument.graphql'
      }
    ];
    },
    fetchFn,
  };
}

export function createBuiltMeshHTTPHandler<TServerContext = {}>(): MeshHTTPHandler<TServerContext> {
  return createMeshHTTPHandler<TServerContext>({
    baseDir,
    getBuiltMesh: getBuiltGraphClient,
    rawServeConfig: undefined,
  })
}


let meshInstance$: Promise<MeshInstance> | undefined;

export function getBuiltGraphClient(): Promise<MeshInstance> {
  if (meshInstance$ == null) {
    meshInstance$ = getMeshOptions().then(meshOptions => getMesh(meshOptions)).then(mesh => {
      const id = mesh.pubsub.subscribe('destroy', () => {
        meshInstance$ = undefined;
        mesh.pubsub.unsubscribe(id);
      });
      return mesh;
    });
  }
  return meshInstance$;
}

export const execute: ExecuteMeshFn = (...args) => getBuiltGraphClient().then(({ execute }) => execute(...args));

export const subscribe: SubscribeMeshFn = (...args) => getBuiltGraphClient().then(({ subscribe }) => subscribe(...args));
export function getBuiltGraphSDK<TGlobalContext = any, TOperationContext = any>(globalContext?: TGlobalContext) {
  const sdkRequester$ = getBuiltGraphClient().then(({ sdkRequesterFactory }) => sdkRequesterFactory(globalContext));
  return getSdk<TOperationContext, TGlobalContext>((...args) => sdkRequester$.then(sdkRequester => sdkRequester(...args)));
}
export type PendingDirectDepositsQueryVariables = Exact<{ [key: string]: never; }>;


export type PendingDirectDepositsQuery = { directDeposits: Array<Pick<DirectDeposit, 'id' | 'zkAddress_pk' | 'zkAddress_diversifier' | 'deposit' | 'fallbackUser' | 'tsInit' | 'txInit'>> };


export const PendingDirectDepositsDocument = gql`
    query PendingDirectDeposits {
  directDeposits(orderBy: bnInit, where: {pending: true}) {
    id
    zkAddress_pk
    zkAddress_diversifier
    deposit
    fallbackUser
    tsInit
    txInit
  }
}
    ` as unknown as DocumentNode<PendingDirectDepositsQuery, PendingDirectDepositsQueryVariables>;


export type Requester<C = {}, E = unknown> = <R, V>(doc: DocumentNode, vars?: V, options?: C) => Promise<R> | AsyncIterable<R>
export function getSdk<C, E>(requester: Requester<C, E>) {
  return {
    PendingDirectDeposits(variables?: PendingDirectDepositsQueryVariables, options?: C): Promise<PendingDirectDepositsQuery> {
      return requester<PendingDirectDepositsQuery, PendingDirectDepositsQueryVariables>(PendingDirectDepositsDocument, variables, options) as Promise<PendingDirectDepositsQuery>;
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;