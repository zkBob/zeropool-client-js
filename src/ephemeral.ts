import HDWalletProvider from '@truffle/hdwallet-provider';
import Web3 from 'web3';
import bip39 from 'bip39-light';
import { hash } from 'tweetnacl';
import { bufToHex, concatenateBuffers, hexToBuf,  } from './utils';


export interface EphemeralAddress {
    index: number,
    address: string,
    nonce: number,
    tokenBalance: bigint,
    nativeBalance: bigint,
}

// The pool of the ephemeral native addresses which are used to support multisig
// The class supports derivation, signing and maintenance ephemeral addresses
// The pool should be initialized with zk-account spending key which will produce entropy
export class EphemeralPool {
    private provider: HDWalletProvider;
    private web3: Web3;

    // Hex representation of the string 'ZKBOB_EPHEMERAL_POOL_ENTROPY_ADD'
    // It's neccessary to make entropy unique
    private skPrefix = '0x5a4b424f425f455048454d4552414c5f504f4f4c5f454e54524f50595f414444';
  
    constructor(sk: Uint8Array, rpcUrl: string) {
        const buf = concatenateBuffers(sk, hexToBuf(this.skPrefix));
        const entropy = hash(buf).slice(0, 16);
        const mnemonic = bip39.entropyToMnemonic(bufToHex(entropy));
        this.provider = new HDWalletProvider({
            mnemonic,
            providerOrUrl: rpcUrl,
        });
        this.web3 = new Web3(this.provider);
    }
  
    static async init(sk: Uint8Array, rpcUrl: string): Promise<EphemeralPool> {
      const storage = new EphemeralPool(sk, rpcUrl);

      return storage;
    }
  
    public async getEphemeralAddress(index: number): Promise<EphemeralAddress> {
        return {
            index,
            address: this.provider.getAddress(index),
            nonce: 0,
            tokenBalance: BigInt(0),
            nativeBalance: BigInt(0),
        };
    }

    public async getNonusedEphemeralIndex(): Promise<number> {
        return 0;
    }

    public async getUsedEphemeralAddresses(): Promise<EphemeralAddress[]> {
        return [{
            index: 0,
            address: '',
            nonce: 0,
            tokenBalance: BigInt(0),
            nativeBalance: BigInt(0),
        }];
    }

    public getEphemeralAddressPrivateKey(index: number): string {
        return '';
    }
}