export interface NetworkBackend {
    getChainId(): Promise<number>;
    getDenominator(contractAddress: string): Promise<bigint>;
    poolLimits(contractAddress: string, address: string | undefined): Promise<any>;
    snarksLimits(contractAddress: string): Promise<any>;
    isSignatureCompact(): boolean;
    defaultNetworkName(): string;
    getRpcUrl(): string;
}