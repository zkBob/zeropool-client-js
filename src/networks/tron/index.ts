import { NetworkBackend, PreparedTransaction } from '..';
import { InternalError, TxType } from '../../index';
import { PoolTxDetails, RegularTxType } from '../../tx';

import tokenAbi from './abi/usdt-abi.json';
import poolAbi from './abi/pool-abi.json';
import ddAbi from './abi/dd-abi.json';
import { SignTypedDataVersion, recoverPersonalSignature, recoverTypedSignature } from '@metamask/eth-sig-util';
import { truncateHexPrefix } from '../../utils';
import { CALLDATA_BASE_LENGTH, decodeEvmCalldata, estimateEvmCalldataLength, getCiphertext } from '../evm/calldata';

const TronWeb = require('tronweb')
const bs58 = require('bs58')

const DEFAULT_DECIMALS = 6;
const DEFAULT_CHAIN_ID = 0x2b6653dc;
const DEFAULT_ENERGY_FEE = 420;

export class TronNetwork implements NetworkBackend {
    protected rpcUrls: string[];
    private curRpcIdx: number;
    protected tronWeb;
    protected address: string;
    // We need to cache a contract object for the each token address separately
    private tokenContracts = new Map<string, object>();  // tokenAddress -> contact object
    private poolContracts = new Map<string, object>();  // tokenAddress -> contact object
    private ddContracts = new Map<string, object>();  // tokenAddress -> contact object

    // blockchain long-lived cached parameters
    private chainId: number | undefined = undefined;
    private energyFee: number | undefined = undefined;
    private tokenSymbols = new Map<string, string>();  // tokenAddress -> token_symbol
    private tokenDecimals = new Map<string, number>();  // tokenAddress -> decimals
    private tokenSellerAddresses = new Map<string, string>();    // poolContractAddress -> tokenSellerContractAddress
    private ddContractAddresses = new Map<string, string>();  // poolAddress -> ddQueueAddress


    // ------------------------=========< Lifecycle >=========------------------------
    // | Init, enabling and disabling backend                                        |
    // -------------------------------------------------------------------------------
    constructor(rpcUrls: string[], enabled: boolean = true) {
        if (rpcUrls.length == 0) {
            throw new InternalError(`TronNetwork: Unable to initialize TronNetwork without RPC URL`);
        }

        this.rpcUrls = rpcUrls.map((aUrl) => aUrl.endsWith('/') ? aUrl : aUrl += '/' );
        this.curRpcIdx = -1;

        if (enabled) {
            this.setEnabled(true);
        }
    }

    private activeTronweb(): any {
        if (!this.tronWeb) {
            throw new InternalError(`TronNetwork: Cannot interact in the disabled mode`);
        }

        return this.tronWeb;
    }

    public isEnabled(): boolean {
        return this.tronWeb !== undefined;
    }

    public setEnabled(enabled: boolean) {
        if (enabled) {
            if (!this.isEnabled()) {
                this.tronWeb = new TronWeb({
                    fullHost: this.curRpcUrl(),
                    privateKey: '01',
                });
            }
        } else {
            this.tronWeb = undefined;
            this.tokenContracts.clear();
            this.poolContracts.clear();
            this.ddContracts.clear();
        }
    }

    protected async getTokenContract(tokenAddres: string): Promise<any> {
        let contract = this.tokenContracts.get(tokenAddres);
        if (!contract) {
            contract = await this.tronWeb.contract(tokenAbi, tokenAddres);
            if (contract) {
                this.tokenContracts.set(tokenAddres, contract);
            } else {
                throw new Error(`Cannot initialize a contact object for the token ${tokenAddres}`);
            }
        }

        return contract;
    }

    protected async getPoolContract(poolAddres: string): Promise<any> {
        let contract = this.poolContracts.get(poolAddres);
        if (!contract) {
            contract = await this.tronWeb.contract(poolAbi, poolAddres);
            if (contract) {
                this.poolContracts.set(poolAddres, contract);
            } else {
                throw new Error(`Cannot initialize a contact object for the pool ${poolAddres}`);
            }
        }

        return contract;
    }

    protected async getDdContract(ddQueueAddress: string): Promise<any> {
        let contract = this.ddContracts.get(ddQueueAddress);
        if (!contract) {
            contract = await this.tronWeb.contract(ddAbi, ddQueueAddress);
            if (contract) {
                this.ddContracts.set(ddQueueAddress, contract);
            } else {
                throw new Error(`Cannot initialize a contact object for the DD queue ${ddQueueAddress}`);
            }
        }

        return contract;
    }


    // ------------------=========< RPC-related routines >=========-------------------
    // | Getting current RPC             |
    // -------------------------------------------------------------------------------

    public curRpcUrl(): string {
        if (this.curRpcIdx < 0) {
            return this.rpcUrls[0];
        } else if (this.curRpcIdx >= this.rpcUrls.length) {
            return this.rpcUrls[this.rpcUrls.length - 1];
        } else {
            return this.rpcUrls[this.curRpcIdx];
        }
    }
    
    // -----------------=========< Token-Related Routiness >=========-----------------
    // | Getting balance, allowance, nonce etc                                       |
    // -------------------------------------------------------------------------------

    public async getTokenName(tokenAddress: string): Promise<string> {
        let res = this.tokenSymbols.get(tokenAddress);
        if (!res) {
            try {
                const token = await this.getTokenContract(tokenAddress);
                res = await token.symbol().call();
                if (typeof res === 'string') {
                    this.tokenSymbols.set(tokenAddress, res);
                } else {
                    throw new Error(`returned token symbol has ${typeof res} type (string expected)`);
                }
            } catch (err) {
                console.warn(`Cannot fetch symbol for the token ${tokenAddress}. Reason: ${err.message}`);
            }
        }
        
        return res ?? '';
    }

    public async getTokenDecimals(tokenAddress: string): Promise<number> {
        let res = this.tokenDecimals.get(tokenAddress);
        if (!res) {
            try {
                const token = await this.getTokenContract(tokenAddress);
                res = Number(await token.decimals().call());
                this.tokenDecimals.set(tokenAddress, res);
            } catch (err) {
                console.warn(`Cannot fetch decimals for the token ${tokenAddress}, using default (${DEFAULT_DECIMALS}). Reason: ${err.message}`);
            }
        }
        
        return res ?? DEFAULT_DECIMALS;
    }

    public async getDomainSeparator(tokenAddress: string): Promise<string> {
        throw new InternalError(`Domain separator is currently unsupported for TRC20 tokens`)
    }
    
    public async getTokenNonce(tokenAddress: string, address: string): Promise<number> {
        throw new InternalError(`Token nonce is currently unsupported for TRC20 tokens`)
    }

    public async getTokenBalance(tokenAddress: string, address: string): Promise<bigint> {    // in wei
        const token = await this.getTokenContract(tokenAddress);
        let result = await token.balanceOf(address).call();

        return result.toString(10);
    }

    public async allowance(tokenAddress: string, owner: string, spender: string): Promise<bigint> {
        const token = await this.getTokenContract(tokenAddress);
        let result = await token.allowance(owner, spender).call();

        return result.toString(10);
    }

    public async permit2NonceBitmap(permit2Address: string, owner: string, wordPos: bigint): Promise<bigint> {
        throw new InternalError(`Nonce bitmaps is currently unsupported for TRC20 tokens`)
    }

    public async erc3009AuthState(tokenAddress: string, authorizer: string, nonce: bigint): Promise<bigint> {
        throw new InternalError(`Authorisation state is currently unsupported for TRC20 tokens`)
    }

    public async approveTokens(
        tokenAddress: string,
        privateKey: string,
        _holder: string,
        spender: string,
        amount: bigint,
        _gasFactor?: number
    ): Promise<string> {
        const selector = 'approve(address,uint256)';
        const parameters = [{type: 'address', value: spender}, {type: 'uint256', value: amount}]
        
        return this.verifyAndSendTx(tokenAddress, selector, parameters, privateKey)
    }



    // ---------------------=========< Pool Interaction >=========--------------------
    // | Getting common info: pool ID, denominator, limits etc                       |
    // -------------------------------------------------------------------------------

    public async getPoolId(poolAddress: string): Promise<number> {
        const pool = await this.getPoolContract(poolAddress);
        let result = await pool.pool_id().call();

        return Number(result);
    }

    public async getDenominator(poolAddress: string): Promise<bigint> {
        const pool = await this.getPoolContract(poolAddress);
        let result = await pool.denominator().call();

        return BigInt(result);
    }

    public async poolState(poolAddress: string, index?: bigint): Promise<{index: bigint, root: bigint}> {
        const pool = await this.getPoolContract(poolAddress);
        let idx;
        if (index === undefined) {
            idx = await pool.pool_index().call();
        } else {
            idx = index.toString();
        }
        const root = await pool.roots(idx).call();

        return {index: BigInt(idx), root: BigInt(root)};
    }

    public async poolLimits(poolAddress: string, address: string | undefined): Promise<any> {
        const pool = await this.getPoolContract(poolAddress);
        let addr = address ?? 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
        
        return await pool.getLimitsFor(addr).call();
    }

    public async getTokenSellerContract(poolAddress: string): Promise<string> {
        let tokenSellerAddr = this.tokenSellerAddresses.get(poolAddress);
        if (!tokenSellerAddr) {
            const pool = await this.getPoolContract(poolAddress);
            tokenSellerAddr = TronWeb.address.fromHex(await pool.tokenSeller().call());
            if (tokenSellerAddr) {
                this.tokenSellerAddresses.set(poolAddress, tokenSellerAddr);
            } else {
                throw new InternalError(`Cannot fetch token seller contract address`);
            }
        }

        return tokenSellerAddr;
    }


    // ---------------------=========< Direct Deposits >=========---------------------
    // | Sending DD and fetching info                                                |
    // -------------------------------------------------------------------------------

    public async getDirectDepositQueueContract(poolAddress: string): Promise<string> {
        let ddContractAddr = this.ddContractAddresses.get(poolAddress);
        if (!ddContractAddr) {
            const pool = await this.getPoolContract(poolAddress);
            ddContractAddr = TronWeb.address.fromHex(await pool.direct_deposit_queue().call());
            if (ddContractAddr) {
                this.ddContractAddresses.set(poolAddress, ddContractAddr);
            } else {
                throw new InternalError(`Cannot fetch DD contract address`);
            }
        }

        return ddContractAddr;
    }

    public async getDirectDepositFee(ddQueueAddress: string): Promise<bigint> {
        const dd = await this.getDdContract(ddQueueAddress);
        
        return BigInt(await dd.directDepositFee().call());
    }

    public async createDirectDepositTx(
        ddQueueAddress: string,
        amount: bigint,
        zkAddress: string,
        fallbackAddress: string,
    ): Promise<PreparedTransaction> {
        const zkAddrBytes = `0x${Buffer.from(bs58.decode(zkAddress.substring(zkAddress.indexOf(':') + 1))).toString('hex')}`;
        const selector = 'directDeposit(address,uint256,bytes)';
        const parameters = [
            {type: 'address', value: fallbackAddress},
            {type: 'uint256', value: amount},
            {type: 'bytes', value: zkAddrBytes}
        ];
        const tx = await this.tronWeb.transactionBuilder.triggerSmartContract(ddQueueAddress, selector, { feeLimit: 100_000_000 }, parameters);
        //const protobuf = await this.tronWeb.utils.transaction.txJsonToPb(tx.transaction);

        return {
            to: ddQueueAddress,
            amount: 0n,
            data: tx.transaction.raw_data_hex, // TODO: check what inside a protobuf and get pure calldata
            selector,
        };
    }

    public async createNativeDirectDepositTx(
        ddQueueAddress: string,
        nativeAmount: bigint,
        zkAddress: string,
        fallbackAddress: string,
    ): Promise<PreparedTransaction> {
        throw new InternalError(`Native direct deposits are currently unsupported for Tron deployments`)
    }

    // ------------------------=========< Signatures >=========-----------------------
    // | Signing and recovery                                                        |
    // -------------------------------------------------------------------------------

    public async sign(data: any, privKey: string): Promise<string> {
        return await this.tronWeb.trx.sign(data, privKey);
    }

    public async signTypedData(typedData: any, privKey: string): Promise<string> {
        if (typedData && typedData.domain && typedData.types && typedData.message) {
            return await this.tronWeb.trx._signTypedData(typedData.domain, typedData.types, typedData.message, privKey);
        }

        throw new Error('Incorrect signing request: it must contains at least domain, types and message keys')
    }

    // TODO: check it!
    public async recoverSigner(data: any, signature: string): Promise<string> {
        const recovered = recoverPersonalSignature({
            data: data,
            signature: this.toCanonicalSignature(signature)
        });
        const tronAddress = '41' + recovered.slice(2);
        const base58Address = TronWeb.address.fromHex(tronAddress);

        return base58Address;
    }

    // TODO: check it!
    public async recoverSignerTypedData(typedData: any, signature: string): Promise<string> {
        const recovered = recoverTypedSignature({
            data: typedData,
            signature: this.toCanonicalSignature(signature),
            version: SignTypedDataVersion.V4
        });

        const tronAddress = '41' + recovered.slice(2);
        const base58Address = TronWeb.address.fromHex(tronAddress);

        return base58Address;
    }

    public toCompactSignature(signature: string): string {
        signature = truncateHexPrefix(signature);
      
        if (signature.length > 128) {
          // it seems it's an extended signature, let's compact it!
          const v = signature.slice(128, 130);
          if (v == "1c") {
            return `0x${signature.slice(0, 64)}${(parseInt(signature[64], 16) | 8).toString(16)}${signature.slice(65, 128)}`;
          } else if (v != "1b") {
            throw new InternalError("Invalid signature: v should be 27 or 28");
          }
      
          return '0x' + signature.slice(0, 128);
        } else if (signature.length < 128) {
          throw new InternalError("invalid signature: it should consist at least 64 bytes (128 chars)");
        }
      
        // it seems the signature already compact
        return '0x' + signature;
    }
    
    public toCanonicalSignature(signature: string): string {
        let sig = truncateHexPrefix(signature);
        
        if ((sig.length % 2) == 0) {
            if (sig.length == 128) {
            return `0x` + sig;
            } else if (sig.length == 130) {
            let v = "1b";
            if (parseInt(sig[64], 16) > 7) {
                v = "1c";
                sig = sig.slice(0, 64) + `${(parseInt(sig[64], 16) & 7).toString(16)}` + sig.slice(65);
            }
                return `0x` + sig + v;
            } else {
                throw new InternalError(`Incorrect signature length (${sig.length}), expected 64 or 65 bytes (128 or 130 chars)`);
            }
        } else {
            throw new InternalError(`Incorrect signature length (${sig.length}), expected an even number`);
        }
    }




    // ----------------------=========< Miscellaneous >=========----------------------
    // | Getting tx revert reason, chain ID, signature format, etc...                |
    // -------------------------------------------------------------------------------

    public async getTxRevertReason(txHash: string): Promise<string | null> {
        return 'UNKNOWN_REASON'
    }

    public async getChainId(): Promise<number> {
        if (this.chainId === undefined) {
            // tronweb cannot fetch chainId
            // so we should request it directly from the JSON RPC endpoint
            const tryUrls = [`${this.curRpcUrl()}jsonrpc`, this.curRpcUrl()];
            for (let aAttemptUrl of tryUrls) {
                try {
                    const chainId = await this.fetchChainIdFrom(aAttemptUrl);
                    this.chainId = chainId;
                    return chainId;
                } catch(err) {
                    console.warn(`Cannot fetch chainId from ${aAttemptUrl}: ${err.message}`);
                }
            }

            // unable to fetch
            console.warn(`Unable to get actual chainId. Will using default for Tron mainnet (${DEFAULT_CHAIN_ID})`)

            return DEFAULT_CHAIN_ID;
        }

        return this.chainId;
    }

    public async getNativeBalance(address: string): Promise<bigint> {
        return BigInt(await this.tronWeb.trx.getBalance(address));
    }

    public async getNativeNonce(address: string): Promise<number> {
        return 0;
    }

    public async getTxDetails(index: number, poolTxHash: string): Promise<PoolTxDetails | null> {
        try {
            const tronTransaction = await this.tronWeb.trx.getTransaction(poolTxHash);
            const tronTransactionInfo = await this.tronWeb.trx.getTransaction(poolTxHash);
            const txData = tronTransaction.raw_data_hex;


            if (txData && txData.blockNumber && txData.input) {
                throw new InternalError(`unimplemented`);
                /*const block = await this.activeWeb3().eth.getBlock(txData.blockNumber).catch(() => null);
                if (block && block.timestamp) {
                    let timestamp: number = 0;
                    if (typeof block.timestamp === "number" ) {
                        timestamp = block.timestamp;
                    } else if (typeof block.timestamp === "string" ) {
                        timestamp = Number(block.timestamp);
                    }

                    let isMined = false;
                    const txReceipt = await this.activeWeb3().eth.getTransactionReceipt(poolTxHash);
                    if (txReceipt && txReceipt.status !== undefined && txReceipt.status == true) {
                        isMined = true;
                    }

                    const txSelector = txData.input.slice(2, 10).toLowerCase();
                    if (txSelector == PoolSelector.Transact) {
                        const tx = decodeEvmCalldata(txData.input);
                        const feeAmount = BigInt('0x' + tx.memo.slice(0, 16));
                        
                        const txInfo = new RegularTxDetails();
                        txInfo.txType = tx.txType;
                        txInfo.tokenAmount = tx.tokenAmount;
                        txInfo.feeAmount = feeAmount;
                        txInfo.txHash = poolTxHash;
                        txInfo.isMined = isMined
                        txInfo.timestamp = timestamp;
                        txInfo.nullifier = '0x' + toTwosComplementHex(BigInt((tx.nullifier)), 32);
                        txInfo.commitment = '0x' + toTwosComplementHex(BigInt((tx.outCommit)), 32);
                        txInfo.ciphertext = getCiphertext(tx);

                        // additional tx-specific fields for deposits and withdrawals
                        if (tx.txType == RegularTxType.Deposit) {
                            if (tx.extra && tx.extra.length >= 128) {
                                const fullSig = this.toCanonicalSignature(tx.extra.slice(0, 128));
                                txInfo.depositAddr = await this.activeWeb3().eth.accounts.recover(txInfo.nullifier, fullSig);
                            } else {
                                // incorrect signature
                                throw new InternalError(`No signature for approve deposit`);
                            }
                        } else if (tx.txType == RegularTxType.BridgeDeposit) {
                            txInfo.depositAddr = '0x' + tx.memo.slice(32, 72);
                        } else if (tx.txType == RegularTxType.Withdraw) {
                            txInfo.withdrawAddr = '0x' + tx.memo.slice(32, 72);
                        }

                        return {
                            poolTxType: PoolTxType.Regular,
                            details: txInfo,
                            index,
                        };
                    } else if (txSelector == PoolSelector.AppendDirectDeposit) {
                        const txInfo = new DDBatchTxDetails();
                        txInfo.txHash = poolTxHash;
                        txInfo.isMined = isMined;
                        txInfo.timestamp = timestamp;
                        txInfo.deposits = [];    // TODO!!!

                        // WIP

                        return {
                            poolTxType: PoolTxType.DirectDepositBatch,
                            details: txInfo,
                            index,
                        };
                    } else {
                        throw new InternalError(`[EvmNetwork]: Cannot decode calldata for tx ${poolTxHash} (incorrect selector ${txSelector})`);
                    }
                } else {
                    console.warn(`[EvmNetwork]: cannot get block (${txData.blockNumber}) to retrieve timestamp`);      
                }*/
            } else {
              console.warn(`[TronNetwork]: cannot get native tx ${poolTxHash} (tx still not mined?)`);
            }
        } catch (err) {
            console.warn(`[TronNetwork]: cannot get native tx ${poolTxHash} (${err.message})`);
        }
          
        return null;
    }

    public calldataBaseLength(): number {
        return CALLDATA_BASE_LENGTH;
    }

    public estimateCalldataLength(txType: RegularTxType, notesCnt: number, extraDataLen: number = 0): number {
        return estimateEvmCalldataLength(txType, notesCnt, extraDataLen)
    }


    // xxxxxxxxxxxxxxxxxxxxXXXXXXXXX< Private routines >XXXXXXXXXxxxxxxxxxxxxxxxxxxxxx
    // x Sending tx, working with energy and others                                  x
    // xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

    private async fetchChainIdFrom(url: string): Promise<number> {
        const body = {"jsonrpc":"2.0", "method": "eth_chainId", "params": [], "id": 1};
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: {'Content-Type': 'application/json; charset=UTF-8'} });
          
        if (!response.ok) {
            throw new Error(`Cannot fetch from JSON RPC (error ${response.status}): ${response.body ?? 'no description'}`);
        }
        
        const json = await response.json();
        if (json && json.result) {
            return Number(json.result);
        }

        throw new Error(`Cannot fetch from JSON RPC: incorrect response JSON (${json})`);
    }
    
    private async getEnergyCost(): Promise<number> {
        if (this.energyFee === undefined) {
            try {
                const chainParams = await this.tronWeb.trx.getChainParameters();
                for (let aParam of chainParams) {
                    if (aParam.key == 'getEnergyFee') {
                        this.energyFee = Number(aParam.value);
                        return this.energyFee;
                    }
                }

                console.warn(`Cannot get energy fee: no such key in chain parameters (getEnergyFee). Will using defaul ${DEFAULT_ENERGY_FEE}`);
            } catch(err) {
                console.warn(`Cannot get energy fee: ${err}`);
            }
        }

        return this.energyFee ?? DEFAULT_ENERGY_FEE;

    }

    private async getAccountEnergy(address: string): Promise<number> {
        try {
            const accResources = await this.tronWeb.trx.getAccountResources(address);
            return Number(accResources.EnergyLimit ?? 0) - Number(accResources.EnergyUsed ?? 0);
        } catch(err) {
            console.warn(`Cannot get account energy: ${err}`);
        }
        
        return 0;
    }

    private async verifyAndSendTx(
        contractAddress: string,
        selector: string,
        parameters: Array<object>,
        privateKey: string,
        feeLimit: number = 100_000_000,
        validateBalance: boolean = true,
    ): Promise<string> {
        // create tx to validate it's correct
        let tx = await this.tronWeb.transactionBuilder.triggerConstantContract(contractAddress, selector, { feeLimit }, parameters)
            .catch((err: string) => {
                throw new Error(`Tx validation error: ${err}`);
            });

        if (validateBalance) {
            // Check is sufficient resources for the fee
            const sender = TronWeb.address.fromPrivateKey(truncateHexPrefix(privateKey));
            const energyCost = await this.getEnergyCost();;
            const accEnergy = await this.getAccountEnergy(sender);
            const accBalance = Number(await this.getNativeBalance(sender));
            const neededForFee = tx.energy_used * energyCost;
            // TODO: take into account bandwidth consumption
            if ((accBalance + energyCost * accEnergy) < neededForFee) {
                throw new Error(`Insufficient balance for fee (available ${accBalance} sun + ${accEnergy} energy, needed at least ${neededForFee})`)
            };
        }

        // create actual tx with feeLimit field
        // it's a tronweb bug: triggerConstantContract doesn't include feeLimit in the transaction
        // so it can be reverted in case of out-of-energy
        tx = await this.tronWeb.transactionBuilder.triggerSmartContract(contractAddress, selector, { feeLimit }, parameters);
        // sign and send
        const signedTx = await this.tronWeb.trx.sign(tx.transaction, privateKey);
        const result = await this.tronWeb.trx.sendRawTransaction(signedTx);

        return result.txid;
    }

}