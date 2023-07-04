// @ts-nocheck
import { GraphQLResolveInfo, SelectionSetNode, FieldNode, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { GetMeshOptions } from '@graphql-mesh/runtime';
import type { YamlConfig } from '@graphql-mesh/types';
import { PubSub } from '@graphql-mesh/utils';
import { DefaultLogger } from '@graphql-mesh/utils';
import MeshCache from "@graphql-mesh/cache-localforage";
import { fetch as fetchFn } from '@whatwg-node/fetch';

import { MeshResolvedSource } from '@graphql-mesh/runtime';
import { MeshTransform, MeshPlugin } from '@graphql-mesh/types';
import GraphqlHandler from "@graphql-mesh/graphql"
import BareMerger from "@graphql-mesh/merger-bare";
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

export type BlockChangedFilter = {
  number_gte: Scalars['Int'];
};

export type Block_height = {
  hash?: InputMaybe<Scalars['Bytes']>;
  number?: InputMaybe<Scalars['Int']>;
  number_gte?: InputMaybe<Scalars['Int']>;
};

export type DirectDeposit = {
  id: Scalars['String'];
  pending: Scalars['Boolean'];
  completed: Scalars['Boolean'];
  refunded: Scalars['Boolean'];
  sender: Scalars['Bytes'];
  fallbackUser: Scalars['Bytes'];
  zkAddress_diversifier: Scalars['Bytes'];
  zkAddress_pk: Scalars['Bytes'];
  deposit: Scalars['BigInt'];
  bnInit: Scalars['BigInt'];
  tsInit: Scalars['BigInt'];
  txInit: Scalars['Bytes'];
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
  | 'pending'
  | 'completed'
  | 'refunded'
  | 'sender'
  | 'fallbackUser'
  | 'zkAddress_diversifier'
  | 'zkAddress_pk'
  | 'deposit'
  | 'bnInit'
  | 'tsInit'
  | 'txInit'
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

export type Message = {
  id: Scalars['Bytes'];
  index: Scalars['BigInt'];
  hash: Scalars['Bytes'];
  message: Scalars['Bytes'];
  blockNumber: Scalars['BigInt'];
  blockTimestamp: Scalars['BigInt'];
  transactionHash: Scalars['Bytes'];
};

export type Message_filter = {
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
  index?: InputMaybe<Scalars['BigInt']>;
  index_not?: InputMaybe<Scalars['BigInt']>;
  index_gt?: InputMaybe<Scalars['BigInt']>;
  index_lt?: InputMaybe<Scalars['BigInt']>;
  index_gte?: InputMaybe<Scalars['BigInt']>;
  index_lte?: InputMaybe<Scalars['BigInt']>;
  index_in?: InputMaybe<Array<Scalars['BigInt']>>;
  index_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  hash?: InputMaybe<Scalars['Bytes']>;
  hash_not?: InputMaybe<Scalars['Bytes']>;
  hash_gt?: InputMaybe<Scalars['Bytes']>;
  hash_lt?: InputMaybe<Scalars['Bytes']>;
  hash_gte?: InputMaybe<Scalars['Bytes']>;
  hash_lte?: InputMaybe<Scalars['Bytes']>;
  hash_in?: InputMaybe<Array<Scalars['Bytes']>>;
  hash_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  hash_contains?: InputMaybe<Scalars['Bytes']>;
  hash_not_contains?: InputMaybe<Scalars['Bytes']>;
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
  blockNumber?: InputMaybe<Scalars['BigInt']>;
  blockNumber_not?: InputMaybe<Scalars['BigInt']>;
  blockNumber_gt?: InputMaybe<Scalars['BigInt']>;
  blockNumber_lt?: InputMaybe<Scalars['BigInt']>;
  blockNumber_gte?: InputMaybe<Scalars['BigInt']>;
  blockNumber_lte?: InputMaybe<Scalars['BigInt']>;
  blockNumber_in?: InputMaybe<Array<Scalars['BigInt']>>;
  blockNumber_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  blockTimestamp?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_not?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_gt?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_lt?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_gte?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_lte?: InputMaybe<Scalars['BigInt']>;
  blockTimestamp_in?: InputMaybe<Array<Scalars['BigInt']>>;
  blockTimestamp_not_in?: InputMaybe<Array<Scalars['BigInt']>>;
  transactionHash?: InputMaybe<Scalars['Bytes']>;
  transactionHash_not?: InputMaybe<Scalars['Bytes']>;
  transactionHash_gt?: InputMaybe<Scalars['Bytes']>;
  transactionHash_lt?: InputMaybe<Scalars['Bytes']>;
  transactionHash_gte?: InputMaybe<Scalars['Bytes']>;
  transactionHash_lte?: InputMaybe<Scalars['Bytes']>;
  transactionHash_in?: InputMaybe<Array<Scalars['Bytes']>>;
  transactionHash_not_in?: InputMaybe<Array<Scalars['Bytes']>>;
  transactionHash_contains?: InputMaybe<Scalars['Bytes']>;
  transactionHash_not_contains?: InputMaybe<Scalars['Bytes']>;
  /** Filter for the block changed event. */
  _change_block?: InputMaybe<BlockChangedFilter>;
  and?: InputMaybe<Array<InputMaybe<Message_filter>>>;
  or?: InputMaybe<Array<InputMaybe<Message_filter>>>;
};

export type Message_orderBy =
  | 'id'
  | 'index'
  | 'hash'
  | 'message'
  | 'blockNumber'
  | 'blockTimestamp'
  | 'transactionHash';

/** Defines the order direction, either ascending or descending */
export type OrderDirection =
  | 'asc'
  | 'desc';

export type Query = {
  directDeposit?: Maybe<DirectDeposit>;
  directDeposits: Array<DirectDeposit>;
  lastSyncBlock?: Maybe<LastSyncBlock>;
  lastSyncBlocks: Array<LastSyncBlock>;
  message?: Maybe<Message>;
  messages: Array<Message>;
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


export type QuerymessageArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type QuerymessagesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Message_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Message_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Query_metaArgs = {
  block?: InputMaybe<Block_height>;
};

export type Subscription = {
  directDeposit?: Maybe<DirectDeposit>;
  directDeposits: Array<DirectDeposit>;
  lastSyncBlock?: Maybe<LastSyncBlock>;
  lastSyncBlocks: Array<LastSyncBlock>;
  message?: Maybe<Message>;
  messages: Array<Message>;
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


export type SubscriptionmessageArgs = {
  id: Scalars['ID'];
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type SubscriptionmessagesArgs = {
  skip?: InputMaybe<Scalars['Int']>;
  first?: InputMaybe<Scalars['Int']>;
  orderBy?: InputMaybe<Message_orderBy>;
  orderDirection?: InputMaybe<OrderDirection>;
  where?: InputMaybe<Message_filter>;
  block?: InputMaybe<Block_height>;
  subgraphError?: _SubgraphErrorPolicy_;
};


export type Subscription_metaArgs = {
  block?: InputMaybe<Block_height>;
};

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
  BigDecimal: ResolverTypeWrapper<Scalars['BigDecimal']>;
  BigInt: ResolverTypeWrapper<Scalars['BigInt']>;
  BlockChangedFilter: BlockChangedFilter;
  Block_height: Block_height;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
  Bytes: ResolverTypeWrapper<Scalars['Bytes']>;
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
  Message: ResolverTypeWrapper<Message>;
  Message_filter: Message_filter;
  Message_orderBy: Message_orderBy;
  OrderDirection: OrderDirection;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']>;
  Subscription: ResolverTypeWrapper<{}>;
  _Block_: ResolverTypeWrapper<_Block_>;
  _Meta_: ResolverTypeWrapper<_Meta_>;
  _SubgraphErrorPolicy_: _SubgraphErrorPolicy_;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BigDecimal: Scalars['BigDecimal'];
  BigInt: Scalars['BigInt'];
  BlockChangedFilter: BlockChangedFilter;
  Block_height: Block_height;
  Boolean: Scalars['Boolean'];
  Bytes: Scalars['Bytes'];
  DirectDeposit: DirectDeposit;
  DirectDeposit_filter: DirectDeposit_filter;
  Float: Scalars['Float'];
  ID: Scalars['ID'];
  Int: Scalars['Int'];
  Int8: Scalars['Int8'];
  LastSyncBlock: LastSyncBlock;
  LastSyncBlock_filter: LastSyncBlock_filter;
  Message: Message;
  Message_filter: Message_filter;
  Query: {};
  String: Scalars['String'];
  Subscription: {};
  _Block_: _Block_;
  _Meta_: _Meta_;
}>;

export type entityDirectiveArgs = { };

export type entityDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = entityDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type subgraphIdDirectiveArgs = {
  id: Scalars['String'];
};

export type subgraphIdDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = subgraphIdDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type derivedFromDirectiveArgs = {
  field: Scalars['String'];
};

export type derivedFromDirectiveResolver<Result, Parent, ContextType = MeshContext, Args = derivedFromDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export interface BigDecimalScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigDecimal'], any> {
  name: 'BigDecimal';
}

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export interface BytesScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Bytes'], any> {
  name: 'Bytes';
}

export type DirectDepositResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['DirectDeposit'] = ResolversParentTypes['DirectDeposit']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  pending?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  completed?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  refunded?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  sender?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  fallbackUser?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  zkAddress_diversifier?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  zkAddress_pk?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  deposit?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  bnInit?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  tsInit?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  txInit?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  bnClosed?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  tsClosed?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  txClosed?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface Int8ScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Int8'], any> {
  name: 'Int8';
}

export type LastSyncBlockResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['LastSyncBlock'] = ResolversParentTypes['LastSyncBlock']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  block?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MessageResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Message'] = ResolversParentTypes['Message']> = ResolversObject<{
  id?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  index?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  hash?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  message?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  blockNumber?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  blockTimestamp?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  transactionHash?: Resolver<ResolversTypes['Bytes'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  directDeposit?: Resolver<Maybe<ResolversTypes['DirectDeposit']>, ParentType, ContextType, RequireFields<QuerydirectDepositArgs, 'id' | 'subgraphError'>>;
  directDeposits?: Resolver<Array<ResolversTypes['DirectDeposit']>, ParentType, ContextType, RequireFields<QuerydirectDepositsArgs, 'skip' | 'first' | 'subgraphError'>>;
  lastSyncBlock?: Resolver<Maybe<ResolversTypes['LastSyncBlock']>, ParentType, ContextType, RequireFields<QuerylastSyncBlockArgs, 'id' | 'subgraphError'>>;
  lastSyncBlocks?: Resolver<Array<ResolversTypes['LastSyncBlock']>, ParentType, ContextType, RequireFields<QuerylastSyncBlocksArgs, 'skip' | 'first' | 'subgraphError'>>;
  message?: Resolver<Maybe<ResolversTypes['Message']>, ParentType, ContextType, RequireFields<QuerymessageArgs, 'id' | 'subgraphError'>>;
  messages?: Resolver<Array<ResolversTypes['Message']>, ParentType, ContextType, RequireFields<QuerymessagesArgs, 'skip' | 'first' | 'subgraphError'>>;
  _meta?: Resolver<Maybe<ResolversTypes['_Meta_']>, ParentType, ContextType, Partial<Query_metaArgs>>;
}>;

export type SubscriptionResolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  directDeposit?: SubscriptionResolver<Maybe<ResolversTypes['DirectDeposit']>, "directDeposit", ParentType, ContextType, RequireFields<SubscriptiondirectDepositArgs, 'id' | 'subgraphError'>>;
  directDeposits?: SubscriptionResolver<Array<ResolversTypes['DirectDeposit']>, "directDeposits", ParentType, ContextType, RequireFields<SubscriptiondirectDepositsArgs, 'skip' | 'first' | 'subgraphError'>>;
  lastSyncBlock?: SubscriptionResolver<Maybe<ResolversTypes['LastSyncBlock']>, "lastSyncBlock", ParentType, ContextType, RequireFields<SubscriptionlastSyncBlockArgs, 'id' | 'subgraphError'>>;
  lastSyncBlocks?: SubscriptionResolver<Array<ResolversTypes['LastSyncBlock']>, "lastSyncBlocks", ParentType, ContextType, RequireFields<SubscriptionlastSyncBlocksArgs, 'skip' | 'first' | 'subgraphError'>>;
  message?: SubscriptionResolver<Maybe<ResolversTypes['Message']>, "message", ParentType, ContextType, RequireFields<SubscriptionmessageArgs, 'id' | 'subgraphError'>>;
  messages?: SubscriptionResolver<Array<ResolversTypes['Message']>, "messages", ParentType, ContextType, RequireFields<SubscriptionmessagesArgs, 'skip' | 'first' | 'subgraphError'>>;
  _meta?: SubscriptionResolver<Maybe<ResolversTypes['_Meta_']>, "_meta", ParentType, ContextType, Partial<Subscription_metaArgs>>;
}>;

export type _Block_Resolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['_Block_'] = ResolversParentTypes['_Block_']> = ResolversObject<{
  hash?: Resolver<Maybe<ResolversTypes['Bytes']>, ParentType, ContextType>;
  number?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  timestamp?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type _Meta_Resolvers<ContextType = MeshContext, ParentType extends ResolversParentTypes['_Meta_'] = ResolversParentTypes['_Meta_']> = ResolversObject<{
  block?: Resolver<ResolversTypes['_Block_'], ParentType, ContextType>;
  deployment?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  hasIndexingErrors?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = MeshContext> = ResolversObject<{
  BigDecimal?: GraphQLScalarType;
  BigInt?: GraphQLScalarType;
  Bytes?: GraphQLScalarType;
  DirectDeposit?: DirectDepositResolvers<ContextType>;
  Int8?: GraphQLScalarType;
  LastSyncBlock?: LastSyncBlockResolvers<ContextType>;
  Message?: MessageResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  _Block_?: _Block_Resolvers<ContextType>;
  _Meta_?: _Meta_Resolvers<ContextType>;
}>;

export type DirectiveResolvers<ContextType = MeshContext> = ResolversObject<{
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
const additionalTypeDefs = [] as any[];
const zkbobBobGoerliHandler = new GraphqlHandler({
              name: "zkbob-bob-goerli",
              config: {"endpoint":"https://api.thegraph.com/subgraphs/name/zkbob/zkbob-bob-goerli"},
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
const additionalResolvers = [] as any[]
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