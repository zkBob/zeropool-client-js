export interface NetworkBackend {
    getChainId(): Promise<number>;
    getTokenName(tokenAddress: string): Promise<string>;
    getTokenNonce(tokenAddress: string, address: string): Promise<number>;
    getDenominator(contractAddress: string): Promise<bigint>;
    poolLimits(contractAddress: string, address: string | undefined): Promise<any>;
    poolState(contractAddress: string, index?: bigint): Promise<{index: bigint, root: bigint}>;
    getTxRevertReason(txHash: string): Promise<string | null>
    isSignatureCompact(): boolean;
    defaultNetworkName(): string;
    getRpcUrl(): string;
    
}