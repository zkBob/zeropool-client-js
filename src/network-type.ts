export const ZKBOB_PURPOSE = 2448;

// Using strings here for better debuggability
export enum NetworkType {
  ethereum = 'ethereum',
  polygon = 'polygon',
  optimism = 'optimism',
  tron = 'tron',
  // testnets
  sepolia = 'sepolia',
  goerli = 'goerli',
  goerliOptimism = 'goerli-optimism',
  shasta = 'shasta', // TRON testnet
  nile = 'nile',     // TRON testnet
  localNode = 'local-node',
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
      case NetworkType.polygon:
      case NetworkType.optimism:
      case NetworkType.tron:
      case NetworkType.sepolia:
      case NetworkType.goerli:
      case NetworkType.goerliOptimism:
      case NetworkType.shasta:
      case NetworkType.nile:
      case NetworkType.localNode:
        return `/0'/0/${account}`;
        
      default:
        return `/${account}'`;
    }
  }

  // TODO: Use a full list of coins.
  export function coinNumber(network: NetworkType): number {
    switch (network) {
      case NetworkType.ethereum:
        return 60;
      case NetworkType.polygon:
        return 966;
      case NetworkType.optimism:
        return 614;
      case NetworkType.tron:
        return 195;
      case NetworkType.sepolia:
      case NetworkType.goerli:
      case NetworkType.goerliOptimism:
      case NetworkType.shasta:
      case NetworkType.nile:
      case NetworkType.localNode:
        return 1;

      default:
        return 0;
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
      case 0x2b6653dc: // 728126428
        return 'tron';
      case 11155111:
        return 'sepolia';
      case 5:
        return 'goerli';
      case 420:
        return 'goerli-optimism';
      case 0x94a9059e:  // 2494104990
        return 'shasta';
      case 0xcd8690dc:  //3448148188
        return 'nile';
      case 1337:
      case 31337:
        return 'local-node';

      default:
        return undefined;
    }
  }
}
