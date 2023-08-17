import { hash } from 'tweetnacl';
import { addHexPrefix, bufToHex, concatenateBuffers, hexToBuf } from './utils';
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { InternalError } from './errors';
import { NetworkType } from './network-type';
import { tokenABI } from './networks/evm/evm-abi';
import { NetworkBackend } from './networks/network';

const util = require('ethereumjs-util');

const GAS_PRICE_MULTIPLIER = 1.1;

// The interface used to describe address with preloaded properties
export interface EphemeralAddress {
    // main fields
    index: number,          // index of address inside a pool (lasst HD path component)
    address: string,        // native address
    tokenBalance: bigint,   // token balance (in Gwei)
    nativeBalance: bigint,  // native address balance (in Gwei)
    permitNonce: number,    // number of executed permit allowances
    nativeNonce: number,    // number of outcoming native transactions
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
    private tokenAddress: string;
    private hdwallet: HDKey;
    private network: NetworkBackend;
    private poolDenominator: bigint; // we represent all amounts in that library as in pool

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
        networkType: NetworkType,
        network: NetworkBackend,
        poolDenominator: bigint
    ) {
        this.tokenAddress = tokenAddress;
        this.poolDenominator = poolDenominator;
        this.network = network;

        let buf = concatenateBuffers(hexToBuf(this.skPrefix), sk);
        let entropy = hash(buf).slice(0, 16);
        let mnemonic = entropyToMnemonic(entropy, wordlist);
        let seed = mnemonicToSeedSync(mnemonic);
        let ephemeralWalletPath = `${NetworkType.chainPath(networkType)}/0'/0`;
        this.hdwallet = HDKey.fromMasterSeed(seed).derive(ephemeralWalletPath);
    }
  
    static async init(
        sk: Uint8Array,
        tokenAddress: string,
        networkType: NetworkType,
        network: NetworkBackend,
        poolDenominator: bigint
    ): Promise<EphemeralPool> {
        const storage = new EphemeralPool(sk, tokenAddress, networkType, network, poolDenominator);

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
        //const curBlock = await this.web3.eth.getBlockNumber();
        let info = this.cachedInTransfersInfo.get(index);
        if (info === undefined) {
            info = {index, blockNumber: -1, txCount: 0 };
        }

        return info.txCount;

        /*let txCnt = await this.getIncomingTokenTxCount(address, curBlock, info.blockNumber + 1);

        info.blockNumber = curBlock;
        info.txCount += txCnt;

        this.cachedInTransfersInfo.set(index, info);

        return info.txCount;*/
    }

    // Get number of outcoming token transfers
    public async getEphemeralAddressOutTxCount(index: number): Promise<number> {
        const address = this.getAddress(index);
        //const curBlock = await this.web3.eth.getBlockNumber();
        let info = this.cachedOutTransfersInfo.get(index);
        if (info === undefined) {
            info = {index, blockNumber: -1, txCount: 0 };
        }

        return info.txCount;

        /*let txCnt = await this.getOutcomingTokenTxCount(address, curBlock, info.blockNumber + 1);

        info.blockNumber = curBlock;
        info.txCount += txCnt;

        this.cachedOutTransfersInfo.set(index, info);

        return info.txCount;*/
    }

    public async allowance(index: number, spender: string): Promise<bigint> {
        const address = this.getAddress(index);
        return await this.network.allowance(this.tokenAddress, address, spender);
    }

    public async approve(index: number, spender: string, amount: bigint): Promise<string> {
        const address = await this.getAddress(index);
        const privKey = this.getEphemeralAddressPrivateKey(index);
        
        return this.network.approveTokens(this.tokenAddress, privKey, address, spender, amount, GAS_PRICE_MULTIPLIER);
    }

    // ------------------=========< Private Routines >=========--------------------
    // | Retrieving address info                                                  |
    // ----------------------------------------------------------------------------

    // get and update address details
    private async updateAddressInfo(existing: EphemeralAddress): Promise<EphemeralAddress> {
        let promises = [
            this.getTokenBalance(existing.address),
            this.network.getNativeBalance(existing.address),
            this.network.getTokenNonce(this.tokenAddress, existing.address).catch(() => {
                // fallback for tokens without permit support (e.g. WETH)
                return 0;
            }),
            this.network.getNativeNonce(existing.address),
        ];
        const [tokenBalance, nativeBalance, permitNonce, nativeNonce] = await Promise.all(promises);

        existing.tokenBalance = BigInt(tokenBalance);
        existing.nativeBalance = BigInt(nativeBalance);
        existing.permitNonce = Number(permitNonce);
        existing.nativeNonce = Number(nativeNonce);
        
        return existing;
    }
    
    // in pool dimension
    private async getTokenBalance(address: string): Promise<bigint> {
        const result = await this.network.getTokenBalance(this.tokenAddress, address);
        
        return this.poolDenominator > 0 ?
                BigInt(result) / this.poolDenominator :
                BigInt(result) * (-this.poolDenominator);
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
    /*private async getIncomingTokenTxCount(address: string, toBlock: number, fromBlock: number = 0): Promise<number> {
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
    }*/

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