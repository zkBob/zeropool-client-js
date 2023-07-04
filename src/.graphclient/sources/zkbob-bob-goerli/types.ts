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

  export type QuerySdk = {
      /** null **/
  directDeposit: InContextSdkMethod<Query['directDeposit'], QuerydirectDepositArgs, MeshContext>,
  /** null **/
  directDeposits: InContextSdkMethod<Query['directDeposits'], QuerydirectDepositsArgs, MeshContext>,
  /** null **/
  lastSyncBlock: InContextSdkMethod<Query['lastSyncBlock'], QuerylastSyncBlockArgs, MeshContext>,
  /** null **/
  lastSyncBlocks: InContextSdkMethod<Query['lastSyncBlocks'], QuerylastSyncBlocksArgs, MeshContext>,
  /** null **/
  message: InContextSdkMethod<Query['message'], QuerymessageArgs, MeshContext>,
  /** null **/
  messages: InContextSdkMethod<Query['messages'], QuerymessagesArgs, MeshContext>,
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
  lastSyncBlock: InContextSdkMethod<Subscription['lastSyncBlock'], SubscriptionlastSyncBlockArgs, MeshContext>,
  /** null **/
  lastSyncBlocks: InContextSdkMethod<Subscription['lastSyncBlocks'], SubscriptionlastSyncBlocksArgs, MeshContext>,
  /** null **/
  message: InContextSdkMethod<Subscription['message'], SubscriptionmessageArgs, MeshContext>,
  /** null **/
  messages: InContextSdkMethod<Subscription['messages'], SubscriptionmessagesArgs, MeshContext>,
  /** Access to subgraph metadata **/
  _meta: InContextSdkMethod<Subscription['_meta'], Subscription_metaArgs, MeshContext>
  };

  export type Context = {
      ["zkbob-bob-goerli"]: { Query: QuerySdk, Mutation: MutationSdk, Subscription: SubscriptionSdk },
      
    };
}
