import HDWalletProvider from '@truffle/hdwallet-provider';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract'
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
    private token: Contract;


    // Hex representation of the string 'ZKBOB_EPHEMERAL_POOL_ENTROPY_ADD'
    // It's neccessary to make entropy unique
    private skPrefix = '0x5a4b424f425f455048454d4552414c5f504f4f4c5f454e54524f50595f414444';
  
    constructor(sk: Uint8Array, tokenAddress: string, rpcUrl: string) {
        const buf = concatenateBuffers(hexToBuf(this.skPrefix), sk);
        const entropy = hash(buf).slice(0, 16);
        const mnemonic = bip39.entropyToMnemonic(bufToHex(entropy));
        this.provider = new HDWalletProvider({
            mnemonic,
            numberOfAddresses: 2,
            addressIndex: 0,
            providerOrUrl: rpcUrl,
        });
        this.web3 = new Web3(this.provider);

        // Set the ERC-20 balanceOf() ABI
        const balanceOfABI: AbiItem[] = [{
            constant: true,
            inputs: [{
                name: '_owner',
                type: 'address'
            }],
            name: 'balanceOf',
            outputs: [{
                name: 'balance',
                type: 'uint256'
            }],
            payable: false,
            stateMutability: 'view',
            type: 'function'
        }];

        this.token = new this.web3.eth.Contract(balanceOfABI, tokenAddress) as unknown as Contract;
    }
  
    static async init(sk: Uint8Array, tokenAddress: string, rpcUrl: string): Promise<EphemeralPool> {
      const storage = new EphemeralPool(sk, tokenAddress, rpcUrl);

      return storage;
    }
  
    public async getEphemeralAddress(index: number): Promise<EphemeralAddress> {
        const address = this.provider.getAddress(index);
        return {
            index,
            address,
            nonce: await this.web3.eth.getTransactionCount(address),
            tokenBalance: await this.getTokenBalance(address),
            nativeBalance: await this.getNativeBalance(address),
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

    // in Gwei
    private async getNativeBalance(address: string): Promise<bigint> {
        const result = await this.web3.eth.getBalance(address);
        
        const balanceGwei = this.web3.utils.fromWei(result, "Gwei");
        
        return BigInt(balanceGwei);
    }
    
    // in Gwei
    private async getTokenBalance(address: string): Promise<bigint> {
        const result = await this.token.methods.balanceOf(address).call();
        
        const tokenGwei = this.web3.utils.fromWei(result, "Gwei");
        
        return BigInt(tokenGwei);
    }
    
}