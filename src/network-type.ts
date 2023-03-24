export const ZKBOB_PURPOSE = 2448;

// Using strings here for better debuggability
export enum NetworkType {
  ethereum = 'ethereum',
  xdai = 'xdai',
  aurora = 'aurora',
  near = 'near',
  waves = 'waves',
  polkadot = 'polkadot',
  kusama = 'kusama',
  polygon = 'polygon',
  // testnets
  sepolia = 'sepolia',
  goerli = 'goerli',
}

export namespace NetworkType {
  export function derivationPath(network: NetworkType, account: number): string {
    return NetworkType.chainPath(network) + NetworkType.accountPath(network, account);
  }

  export function chainPath(network: NetworkType): string {
    return `m/44'/${NetworkType.coinNumber(network)}'`;
  }

  export function privateDerivationPath(network: NetworkType): string {
    return `m/${ZKBOB_PURPOSE}'/${NetworkType.coinNumber(network)}'`;
  }

  export function accountPath(network: NetworkType, account: number): string {
    switch (network) {
      case NetworkType.ethereum:
      case NetworkType.xdai:
      case NetworkType.aurora:
      case NetworkType.polygon:
      case NetworkType.sepolia:
      case NetworkType.goerli:
        return `/0'/0/${account}`;
      case NetworkType.near:
        return `/${account}'`;
      case NetworkType.waves:
        return `/${account}'/0'/0'`;
      case NetworkType.polkadot:
      case NetworkType.kusama:
        return `/${account}'`;
        
      default:
        return `/${account}'`;
    }
  }

  // TODO: Use a full list of coins.
  export function coinNumber(network: NetworkType): number {
    switch (network) {
      case NetworkType.ethereum:
        return 60;
      case NetworkType.xdai:
        return 700;
      case NetworkType.aurora:
        return 2570;
      case NetworkType.near:
        return 397;
      case NetworkType.waves:
        return 5741564;
      case NetworkType.polkadot:
        return 354;
      case NetworkType.kusama:
        return 434;
      case NetworkType.polygon:
        return 966;
      case NetworkType.sepolia:
      case NetworkType.goerli:
        return 1;
    }

  }

  export function networkName(chainId: number): string | undefined {
    switch (chainId) {
      case 1:
        return 'ethereum';
      case 137:
        return 'polygon';
      case 10:
        return 'optimism';
      case 11155111:
        return 'sepolia';
      case 5:
        return 'goerli';
      case 420:
        return 'goerli-optimism';

      default:
        return undefined;
    }
  }
}
