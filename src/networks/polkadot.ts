import { NetworkBackend } from './network';

export class PolkadotNetwork implements NetworkBackend {
    async getDenominator(contractAddress: string): Promise<bigint> {
        return BigInt(1000); // FIXME
    }

    async tokenTransferedAmount(tokenAddress: string, from: string, to: string): Promise<bigint> {
        return BigInt(0); // FIXME
    }

    async poolLimits(contractAddress: string, address: string | undefined): Promise<any> {
        return undefined; // FIXME
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