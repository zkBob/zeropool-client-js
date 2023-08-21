import { TxType } from "..";
import { PoolTxDetails } from "../tx";

export interface PreparedTransaction {
    to: string;
    amount: bigint;
    data: string;
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
    approveTokens(tokenAddress: string, privateKey: string, holder: string, spender: string, amount: bigint, gasFactor?: number): Promise<string>

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

    // Signatures
    sign(data: any, privKey: string): Promise<string>;
    signTypedData(typedData: any, privKey: string): Promise<string>;
    recoverSigner(data: any, signature: string): Promise<string>;
    recoverSignerTypedData(typedData: any, signature: string): Promise<string>;
    toCompactSignature(signature: string): string;
    toCanonicalSignature(signature: string): string;

    // Miscellaneous
    getTxRevertReason(txHash: string): Promise<string | null>
    getChainId(): Promise<number>;
    getNativeBalance(address: string): Promise<bigint>;
    getNativeNonce(address: string): Promise<number>;
    getTxDetails(index: number, poolTxHash: string): Promise<PoolTxDetails | null>;
    calldataBaseLength(): number;
    estimateCalldataLength(txType: TxType, notesCnt: number, extraDataLen: number): number;
}