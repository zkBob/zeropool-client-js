import { NetworkBackend } from './network';

export class PolkadotNetwork implements NetworkBackend {
    async getChainId(): Promise<number> {
        return 0; // FIXME
    }

    async getDenominator(contractAddress: string): Promise<bigint> {
        return BigInt(1000); // FIXME
    }

    async poolLimits(contractAddress: string, address: string | undefined): Promise<any> {
        return undefined; // FIXME
    }

    async poolState(contractAddress: string): Promise<{index: bigint, root: bigint}> {
        return {index: BigInt(0), root: BigInt(0)};
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