import { NetworkBackend } from './network';

export class PolkadotNetwork implements NetworkBackend {
    isEnabled(): boolean { return false; }
    
    setEnabled(_enabled: boolean) { }

    async getChainId(): Promise<number> {
        return 0; // FIXME
    }

    async getTokenName(_tokenAddress: string): Promise<string> {
        return '';
    }

    async getTokenDecimals(_tokenAddress: string): Promise<number> {
        return 1;
    }
    

    async getTokenNonce(_tokenAddress: string, _address: string): Promise<number> {
        return 0;
    }

    async getTokenBalance(_tokenAddress: string, _address: string): Promise<bigint> {
        return BigInt(0);
    }

    async getDenominator(_contractAddress: string): Promise<bigint> {
        return BigInt(1000); // FIXME
    }

    async getPoolId(_contractAddress: string): Promise<number> {
        return 0; // FIXME
    }

    async poolLimits(_contractAddress: string, _address: string | undefined): Promise<any> {
        return undefined; // FIXME
    }

    async getDirectDepositFee(_contractAddress: string): Promise<bigint> {
        return BigInt(0);
    }

    async poolState(_contractAddress: string, _index?: bigint): Promise<{index: bigint, root: bigint}> {
        return {index: BigInt(0), root: BigInt(0)};
    }

    public async getTxRevertReason(_txHash: string): Promise<string | null> {
        return null;
    }

    isSignatureCompact(): boolean {
        return false;
    }

    defaultNetworkName(): string {
        return 'polkadot';
    }

    getRpcUrl(): string {
        return '';
    }
}