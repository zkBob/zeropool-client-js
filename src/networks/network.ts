export interface PreparedTransaction {
    to: string;
    amount: bigint;
    data: string;
}

export interface NetworkBackend {
    isEnabled(): boolean;
    setEnabled(enabled: boolean);
    getChainId(): Promise<number>;
    getDomainSeparator(tokenAddress: string): Promise<string>;
    getTokenName(tokenAddress: string): Promise<string>;
    getTokenDecimals(tokenAddress: string): Promise<number>;
    getTokenNonce(tokenAddress: string, address: string): Promise<number>;
    getTokenBalance(tokenAddress: string, address: string): Promise<bigint>;
    allowance(tokenAddress: string, owner: string, spender: string): Promise<bigint>;
    permit2NonceBitmap(permit2Address: string, owner: string, wordPos: bigint): Promise<bigint>;
    erc3009AuthState(tokenAddress: string, authorizer: string, nonce: bigint): Promise<bigint>;
    getDenominator(poolAddress: string): Promise<bigint>;
    getPoolId(poolAddress: string): Promise<number>;
    poolLimits(poolAddress: string, address: string | undefined): Promise<any>;
    getDirectDepositQueueContract(poolAddress: string): Promise<string>;
    getDirectDepositFee(ddQueueAddress: string): Promise<bigint>;
    createDirectDepositTx(ddQueueAddress: string, amount: bigint, zkAddress: string, fallbackAddress: string): Promise<PreparedTransaction>;
    createNativeDirectDepositTx(ddQueueAddress: string, nativeAmount: bigint, zkAddress: string, fallbackAddress: string): Promise<PreparedTransaction>;
    poolState(poolAddress: string, index?: bigint): Promise<{index: bigint, root: bigint}>;
    getTxRevertReason(txHash: string): Promise<string | null>
    isSignatureCompact(): boolean;
    defaultNetworkName(): string;
    getRpcUrl(): string;
    
}