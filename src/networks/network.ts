export interface NetworkBackend {
    getChainId(): Promise<number>;
    getTokenName(tokenAddress: string): Promise<string>;
    getTokenNonce(tokenAddress: string, address: string): Promise<number>;
    getTokenBalance(tokenAddress: string, address: string): Promise<bigint>;
    getDenominator(contractAddress: string): Promise<bigint>;
    getPoolId(contractAddress: string): Promise<number>;
    poolLimits(contractAddress: string, address: string | undefined): Promise<any>;
    getDirectDepositFee(contractAddress: string): Promise<bigint>;
    poolState(contractAddress: string, index?: bigint): Promise<{index: bigint, root: bigint}>;
    getTxRevertReason(txHash: string): Promise<string | null>
    isSignatureCompact(): boolean;
    defaultNetworkName(): string;
    getRpcUrl(): string;
    
}