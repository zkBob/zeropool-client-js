import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract'
import { hash } from 'tweetnacl';
import { addHexPrefix, bufToHex, concatenateBuffers, hexToBuf } from './utils';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { InternalError } from './errors';
import { NetworkType } from './network-type';

import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util'

const util = require('ethereumjs-util');

// The interface used to describe address with preloaded properties
export interface EphemeralAddress {
    // main fields
    index: number,          // index of address inside a pool (lasst HD path component)
    address: string,        // native address
    tokenBalance: bigint,   // token balance (in Gwei)
    nativeBalance: bigint,  // native address balance (in Gwei)
    permitNonce: number,          // number of outcoming native transactions
    nativeNonce: number,          // number of outcoming native transactions
}

// Interface for keeping ephemeral address additional info
// Currently it holds just transfers count
// but it designed to support additional fields like txHashes etc in future
interface TransfersInfo {
    index: number;
    blockNumber: number;
    txCount: number;
}

// The pool of the ephemeral native addresses which are used to support multisig
// The class supports derivation, signing and maintenance ephemeral addresses
// The pool should be initialized with zk-account spending key which will produce entropy
// This class should be used directly inside this library only
export class EphemeralPool {
    private hdwallet: HDKey;
    private web3: Web3;
    private token: Contract;
    private rpcUrl: string;
    private poolDenominator: bigint; // we represent all amounts in that library as in pool (Gwei currently)

    // save last scanned address to decrease scan time
    private startScanIndex = 0;
    private scanPromise: Promise<number> | undefined;
    // we cache every scanned address to reduce info retrieving
    private cachedAddresses = new Map<number, EphemeralAddress>();
    // cached token transfers info (mapped by ephemeral address index)
    private cachedInTransfersInfo = new Map<number, TransfersInfo>();
    private cachedOutTransfersInfo = new Map<number, TransfersInfo>();

    // Unused currently (TODO: find an effective way to retrieve contract creation block)
    // Supposed that it can reduce in/out token transfers count retrieving time
    // NOTE: Etherscan solution for verified contracts:
    //       https://docs.etherscan.io/api-endpoints/contracts#get-contract-creator-and-creation-tx-hash 
    private tokenCreationBlock = -1;


    // Hex representation of the string 'ZKBOB_EPHEMERAL_POOL_ENTROPY_ADD'
    // It's neccessary to make entropy unique
    private skPrefix = '0x5a4b424f425f455048454d4552414c5f504f4f4c5f454e54524f50595f414444';
  
    constructor(
        sk: Uint8Array,
        tokenAddress: string,
        network: NetworkType,
        rpcUrl: string,
        poolDenominator: bigint
    ) {
        this.poolDenominator = poolDenominator;
        this.rpcUrl = rpcUrl;
        this.web3 = new Web3(this.rpcUrl);

        let buf = concatenateBuffers(hexToBuf(this.skPrefix), sk);
        let entropy = hash(buf).slice(0, 16);
        let mnemonic = entropyToMnemonic(entropy, wordlist);
        let seed = mnemonicToSeedSync(mnemonic);
        let ephemeralWalletPath = `${NetworkType.chainPath(network)}/0'/0`;
        this.hdwallet = HDKey.fromMasterSeed(seed).derive(ephemeralWalletPath);

        // ERC-20 balanceOf() and Transfer event ABI
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
        }, {
            inputs: [{
                internalType: 'address',
                name: '',
                type: 'address'
            }],
            name: 'nonces',
            outputs: [{
                internalType: 'uint256',
                name: '',
                type: 'uint256'
            }],
            stateMutability: 'view',
            type: 'function'
        }, {
            anonymous: false,
            inputs: [{
                indexed: true,
                name: 'from',
                type: 'address'
            }, {
                indexed: true,
                name: 'to',
                type: 'address'
            }, {
                indexed: false,
                name: 'value',
                type: 'uint256'
            }],
            name: 'Transfer',
            type: 'event'
        }];

        this.token = new this.web3.eth.Contract(balanceOfABI, tokenAddress) as unknown as Contract;
    }
  
    static async init(
        sk: Uint8Array,
        tokenAddress: string,
        network: NetworkType,
        rpcUrl: string,
        poolDenominator: bigint
    ): Promise<EphemeralPool> {
        const storage = new EphemeralPool(sk, tokenAddress, network, rpcUrl, poolDenominator);

        // Start address info preloading
        let startTime = Date.now();
        storage.getNonusedEphemeralIndex().then((nonusedIndex) => {
            console.log(`Preloading ephemeral addresses pool. First nonused address index: ${nonusedIndex} (${Date.now() - startTime} ms)`);
        })

      return storage;
    }

    // Get native address at the specified index without additional info
    public getAddress(index: number): string {
        let key = this.hdwallet.deriveChild(index)
        const publicKey = key.publicKey;
        key.wipePrivateData();
        if (publicKey) {
            const fullPublicKey = util.importPublic(Buffer.from(publicKey));
            return addHexPrefix(util.pubToAddress(fullPublicKey).toString('hex'));
        }

        throw new InternalError(`Cannot generate public key for ephemeral address at index ${index}`);
    }

    // Get address with asssociated info [may take some time]
    public async getEphemeralAddress(index: number): Promise<EphemeralAddress> {
        let cachedData = this.cachedAddresses.get(index);
        if (cachedData == undefined) {
            // no current address in the cache -> create new one
            const address = this.getAddress(index);
            let newAddress = { index,
                                address,
                                tokenBalance: BigInt(0),
                                nativeBalance: BigInt(0),
                                permitNonce: 0,
                                nativeNonce: 0 
                            };
            await this.updateAddressInfo(newAddress);

            this.cachedAddresses.set(index, newAddress);

            return newAddress;
        } else {
            // address already in cache, update its fields from the saved block
            await this.updateAddressInfo(cachedData);
            this.cachedAddresses.set(index, cachedData);

            return cachedData;
        }

    }

    // Scan all addresses from the index 0 and find first empty account
    public async getNonusedEphemeralIndex(): Promise<number> {
        if (this.scanPromise == undefined) {
            this.scanPromise = this.scanRoutine().finally(() => {
              this.scanPromise = undefined;
            });
          } else {
            console.info(`Finding unused ephemeral address already in progress, waiting for finish...`);
          }
      
          return this.scanPromise;
    }

    // Scan all addresses from the index 0 and return all non-empty accounts
    // (scan will stop on first empty address, any holes are not processed)
    public async getUsedEphemeralAddresses(): Promise<EphemeralAddress[]> {
        let result: EphemeralAddress[] = [];

        let idx = 0;
        while(true) {
            let address = await this.getEphemeralAddress(idx);
            if (this.isAddressNonused(address)) {
                break;
            }

            result.push(address);
            idx++;
        }

        if (idx > this.startScanIndex) {
            this.startScanIndex = idx;
        }

        return result;
    }

    // Use this method with caution! Here is sensitive data returned!
    // Use this method only for emergency reasons
    public getEphemeralAddressPrivateKey(index: number): string {
        let key = this.hdwallet.deriveChild(index);        
        if (key.privateKey) {
            let result = bufToHex(key.privateKey);

            // cleanup intermediate sensitive data
            key.wipePrivateData();

            return result;
        }

        throw new InternalError(`Cannot generate private key for ephemeral address at index ${index}`);
    }

    // Get number of incoming token transfers
    public async getEphemeralAddressInTxCount(index: number): Promise<number> {
        const address = this.getAddress(index);
        const curBlock = await this.web3.eth.getBlockNumber();
        let info = this.cachedInTransfersInfo.get(index);
        if (info === undefined) {
            info = {index, blockNumber: -1, txCount: 0 };
        }

        let txCnt = await this.getIncomingTokenTxCount(address, curBlock, info.blockNumber + 1);

        info.blockNumber = curBlock;
        info.txCount += txCnt;

        this.cachedInTransfersInfo.set(index, info);

        return info.txCount;
    }

    // Get number of outcoming token transfers
    public async getEphemeralAddressOutTxCount(index: number): Promise<number> {
        const address = this.getAddress(index);
        const curBlock = await this.web3.eth.getBlockNumber();
        let info = this.cachedOutTransfersInfo.get(index);
        if (info === undefined) {
            info = {index, blockNumber: -1, txCount: 0 };
        }

        let txCnt = await this.getOutcomingTokenTxCount(address, curBlock, info.blockNumber + 1);

        info.blockNumber = curBlock;
        info.txCount += txCnt;

        this.cachedOutTransfersInfo.set(index, info);

        return info.txCount;
    }

    // Sign permittable deposit with desired data
    // data should be object in format as described in https://eips.ethereum.org/EIPS/eip-712
    public async signTypedData(data: any, index: number): Promise<string> {
        let key = this.hdwallet.deriveChild(index);
        if (key.privateKey) {
            let privateKey = Buffer.from(key.privateKey);
            let typedSig;
            try {
                // typedSig is canonical signature (65 bytes long, LSByte: 1b or 1c)
                typedSig = signTypedData({privateKey, data, version: SignTypedDataVersion.V4});
            } catch (err) {
                key.wipePrivateData();
                throw new InternalError(`Cannot sign typed data with ephemeral account #${index}: ${err}`);
            }
            
            // cleanup intermediate sensitive data
            key.wipePrivateData();
            privateKey.fill(0);
            
            return typedSig;
        } else {
            throw new InternalError(`Derived ephemeral address #${index} has no private key`);
        }
    }

    // ------------------=========< Private Routines >=========--------------------
    // | Retrieving address info                                                  |
    // ----------------------------------------------------------------------------

    // Binary search for the contract creation block
    // Used to decrease token transfer count retrieving time
    // WARNING: we cannot use this method because
    // the real RPC nodes cannot return getCode for old blocks
    private async findContractCreationBlock(tokenAddress: string): Promise<number> {
        let fromBlock = 0;
        let toBlock = Number(await this.web3.eth.getBlockNumber());
    
        let contractCode = await this.web3.eth.getCode(tokenAddress, toBlock);
        if (contractCode == "0x") {
            throw new Error(`Contract ${tokenAddress} does not exist!`);
        }
    
        while (fromBlock <= toBlock) {
            let middleBlock = Math.floor((fromBlock + toBlock) / 2);

            try {
                contractCode = await this.web3.eth.getCode(tokenAddress, middleBlock);
            } catch (err) {
                // Here is a case when node doesn't sync whole blockchain
                // so we can't retrieve selected block state
                // In that case let's suppose the contract isn't created yet
                contractCode = '0x';
            }
            
            if (contractCode != '0x') {
                toBlock = middleBlock;
            } else if (contractCode == '0x') {
                fromBlock = middleBlock;
            }
    
            if (toBlock == fromBlock + 1) {
                return toBlock;
            }
        }

        return fromBlock;
    
    }

    // get and update address details
    private async updateAddressInfo(existing: EphemeralAddress): Promise<EphemeralAddress> {
        let promises = [
            this.getTokenBalance(existing.address),
            this.getNativeBalance(existing.address),
            this.getPermitNonce(existing.address),
            this.web3.eth.getTransactionCount(existing.address),
        ];
        const [tokenBalance, nativeBalance, permitNonce, nativeNonce] = await Promise.all(promises);

        existing.tokenBalance = BigInt(tokenBalance);
        existing.nativeBalance = BigInt(nativeBalance);
        existing.permitNonce = Number(permitNonce);
        existing.nativeNonce = Number(nativeNonce);
        
        return existing;
    }

    // in pool dimension (Gwei)
    private async getNativeBalance(address: string): Promise<bigint> {
        const result = await this.web3.eth.getBalance(address);
        
        return BigInt(result) / this.poolDenominator;
    }
    
    // in pool dimension (Gwei)
    private async getTokenBalance(address: string): Promise<bigint> {
        const result = await this.token.methods.balanceOf(address).call();
        
        return BigInt(result) / this.poolDenominator;
    }

    // number of outgoing transfers via permit
    private async getPermitNonce(address: string): Promise<number> {
        const result = await this.token.methods.nonces(address).call();
        
        return Number(result);
    }

    // Find first unused account
    private async scanRoutine(): Promise<number> {
        while (true) {
            const address = await this.getEphemeralAddress(this.startScanIndex);

            if (this.isAddressNonused(address)) {
                break;
            }

            this.startScanIndex++;
        }

        return this.startScanIndex;
    }

    // Number of incoming token transfers to the account
    private async getIncomingTokenTxCount(address: string, toBlock: number, fromBlock: number = 0): Promise<number> {
        if (toBlock >= fromBlock) {
            const events = await this.token.getPastEvents('Transfer', {
                filter: { to: address },
                fromBlock: Math.max(fromBlock, this.tokenCreationBlock),
                toBlock
            });

            return events.length;
        }
        
        return 0;
    }

    // Number of outcoming token transfers from the account
    private async getOutcomingTokenTxCount(address: string, toBlock: number, fromBlock: number = 0): Promise<number> {
        if (toBlock >= fromBlock) {
            const events = await this.token.getPastEvents('Transfer', {
                filter: { from: address },
                fromBlock: Math.max(fromBlock, this.tokenCreationBlock),
                toBlock
            });

            return events.length;
        }

        return 0;
    }

    // address nonused criteria
    private isAddressNonused(address: EphemeralAddress): boolean {
        if (address.tokenBalance == BigInt(0) && 
            address.nativeBalance == BigInt(0) &&
            address.permitNonce == 0 &&
            address.nativeNonce == 0)
        {
            return true;
        }

        return false;
    }
    
}