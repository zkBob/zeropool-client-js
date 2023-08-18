export enum RegularTxType {
  Deposit = '0000',
  Transfer = '0001',
  Withdraw = '0002',
  BridgeDeposit = '0003',
}

export function txTypeToString(txType: RegularTxType): string {
  switch (txType) {
    case RegularTxType.Deposit: return 'deposit';
    case RegularTxType.Transfer: return 'transfer';
    case RegularTxType.Withdraw: return 'withdraw';
    case RegularTxType.BridgeDeposit: return 'bridge-deposit';
  }
}

/** The raw low-level transaction data used on most networks. */
export class ShieldedTx {
  nullifier: bigint;
  outCommit: bigint;
  transferIndex: bigint;
  energyAmount: bigint;
  tokenAmount: bigint;
  transactProof: bigint[];
  rootAfter: bigint;
  treeProof: bigint[];
  txType: RegularTxType;
  memo: string;
  extra: string;
}

// The top-level transaction details needed in the client library (HistoryStorage for example)

export enum PoolTxType {
  Regular,
  DirectDepositBatch,
}

export interface PoolTxDetails {
  poolTxType: PoolTxType,
  details: RegularTxDetails | DDBatchTxDetails,
}

// These fields belongs to the concrete transaction which are extracted
// from the blockchain (or subraph) and needed to create a HistoryRecord
export class CommonTxDetails {
  txHash: string;         // to the pool contract
  isMined: boolean;
  timestamp: number;
}

export class RegularTxDetails extends CommonTxDetails {
  txType: RegularTxType;  // deposit, transfer, withdraw, permit deposit
  tokenAmount: bigint;
  feeAmount: bigint;      // relayer's reward
  depositAddr?: string;   // for deposit txs only
  withdrawAddr?: string;  // for withdraw txs only
  // The following fields are needed for compliance report
  commitment: string;
  nullifier: string;      // 0x-prefixed hex format
  ciphertext: string;
}

export enum DirectDepositState {
  Queued,
  Deposited,
  Refunded,
}

export interface DirectDeposit {
  id: bigint;            // DD queue unique identifier
  state: DirectDepositState;
  amount: bigint;        // in pool resolution
  destination: string;   // zk-addresss
  fallback: string;      // 0x-address to refund DD
  sender: string;        // 0x-address of sender [to the queue]
  queueTimestamp: number;// when it was created
  queueTxHash: string;   // transaction hash to the queue
  timestamp?: number;    // when it was sent to the pool
  txHash?: string;       // transaction hash to the pool
}

export class DDBatchTxDetails extends CommonTxDetails {
  deposits: DirectDeposit[];
}