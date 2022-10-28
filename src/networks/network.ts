export interface NetworkBackend {
    getChainId(): Promise<number>;
    getDenominator(contractAddress: string): Promise<bigint>;
    poolLimits(contractAddress: string, address: string | undefined): Promise<any>;
    poolState(contractAddress: string): Promise<{index: bigint, root: bigint}>;
    isSignatureCompact(): boolean;
    defaultNetworkName(): string;
    getRpcUrl(): string;
}