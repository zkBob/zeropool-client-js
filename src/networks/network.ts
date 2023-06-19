export interface NetworkBackend {
    isEnabled(): boolean;
    setEnabled(enabled: boolean);
    getChainId(): Promise<number>;
    getTokenName(tokenAddress: string): Promise<string>;
    getTokenDecimals(tokenAddress: string): Promise<number>;
    getTokenNonce(tokenAddress: string, address: string): Promise<number>;
    getTokenBalance(tokenAddress: string, address: string): Promise<bigint>;
    allowance(tokenAddress: string, owner: string, spender: string): Promise<bigint>;
    permit2NonceBitmap(permit2Address: string, owner: string, wordPos: bigint): Promise<bigint>;
    erc3009AuthState(tokenAddress: string, authorizer: string, nonce: bigint): Promise<bigint>;
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