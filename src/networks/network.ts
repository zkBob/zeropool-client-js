import { TxType } from "..";

export interface PreparedTransaction {
    to: string;
    amount: bigint;
    data: string;
}

// The fields extracted from the blockchain needed to create a HistoryRecord
export interface PoolTxDetails {
    index: number;
    txType: TxType;
    nullifier: string; // 0x-prefixed
    tokenAmount: bigint;    // token delta
    feeAmount: bigint;
    depositAddr?: string;
    withdrawAddr?: string;
    txHash: string;
    isMined: boolean;
    timestamp: number;
}

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
    getTxDetails(poolTxHash: string): Promise<PoolTxDetails[]>; // in case of DD several tx detaild may produced
}