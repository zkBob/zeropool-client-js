import { DirectDepositState } from "@/dd";
import { TxType } from "..";

export interface PreparedTransaction {
    to: string;
    amount: bigint;
    data: string;
}

// These fields belongs to the concrete transaction which are extracted
// from the blockchain (or subraph) and needed to create a HistoryRecord
export class CommonTxDetails {
    txHash: string;         // to the pool contract
    isMined: boolean;
    timestamp: number;
}

export class RegularTxDetails extends CommonTxDetails {
    txType: TxType;         // deposit, transfer, withdraw, permit deposit
    tokenAmount: bigint;
    feeAmount: bigint;      // relayer's reward
    depositAddr?: string;   // for deposit txs only
    withdrawAddr?: string;  // for withdraw txs only
    // The following fields are needed for compliance report
    commitment: string;
    nullifier: string;      // 0x-prefixed hex format
    ciphertext: string;
}


interface SingleDD {
    destination: string;    // zk-address
    amount: bigint;
    fallback: string;       // 0x-address to refund DD
    initiatorAddr: string;  // who sent tx to the queue
    queueTimestamp: number; // when it was queued
    queueTxHash: string;    // transaction hash to the queue 
}

export class DDBatchTxDetails extends CommonTxDetails {
    id: bigint;             // DD queue unique identifier
    state: DirectDepositState;
    DDs: SingleDD[];
}

export type TxDetails = RegularTxDetails | DDBatchTxDetails | undefined;


export interface NetworkBackend {
    // Backend Maintenance
    isEnabled(): boolean;
    setEnabled(enabled: boolean);
    curRpcUrl(): string

    // Token 
    getTokenName(tokenAddress: string): Promise<string>;
    getTokenDecimals(tokenAddress: string): Promise<number>;
    getDomainSeparator(tokenAddress: string): Promise<string>;
    getTokenNonce(tokenAddress: string, address: string): Promise<number>;
    getTokenBalance(tokenAddress: string, address: string): Promise<bigint>;
    allowance(tokenAddress: string, owner: string, spender: string): Promise<bigint>;
    permit2NonceBitmap(permit2Address: string, owner: string, wordPos: bigint): Promise<bigint>;
    erc3009AuthState(tokenAddress: string, authorizer: string, nonce: bigint): Promise<bigint>;

    // Pool Interaction
    getPoolId(poolAddress: string): Promise<number>;
    getDenominator(poolAddress: string): Promise<bigint>;
    poolState(poolAddress: string, index?: bigint): Promise<{index: bigint, root: bigint}>;
    poolLimits(poolAddress: string, address: string | undefined): Promise<any>;
    getTokenSellerContract(poolAddress: string): Promise<string>;

    // Direct Deposits
    getDirectDepositQueueContract(poolAddress: string): Promise<string>;
    getDirectDepositFee(ddQueueAddress: string): Promise<bigint>;
    createDirectDepositTx(ddQueueAddress: string, amount: bigint, zkAddress: string, fallbackAddress: string): Promise<PreparedTransaction>;
    createNativeDirectDepositTx(ddQueueAddress: string, nativeAmount: bigint, zkAddress: string, fallbackAddress: string): Promise<PreparedTransaction>;

    // Miscellaneous
    getTxRevertReason(txHash: string): Promise<string | null>
    isSignatureCompact(): boolean;
    getChainId(): Promise<number>;
    getNativeBalance(address: string): Promise<bigint>;
    getNativeNonce(address: string): Promise<number>;
    getTxDetails(poolTxHash: string): Promise<TxDetails>;
}