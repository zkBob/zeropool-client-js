import Web3 from 'web3';
import { Contract } from 'web3-eth-contract'
import { TransactionConfig } from 'web3-core'
import { NetworkBackend, PreparedTransaction} from '..';
import { InternalError } from '../../errors';
import { ddContractABI, poolContractABI, tokenABI } from './evm-abi';
import bs58 from 'bs58';
import { DDBatchTxDetails, RegularTxDetails, PoolTxDetails, RegularTxType, PoolTxType, DirectDeposit, DirectDepositState } from '../../tx';
import { addHexPrefix, bufToHex, hexToBuf, toTwosComplementHex, truncateHexPrefix } from '../../utils';
import { CALLDATA_BASE_LENGTH, decodeEvmCalldata, estimateEvmCalldataLength, getCiphertext } from './calldata';
import { recoverTypedSignature, signTypedData, SignTypedDataVersion,
        personalSign, recoverPersonalSignature } from '@metamask/eth-sig-util'
import { privateToAddress, bufferToHex, isHexPrefixed } from '@ethereumjs/util';
import { isAddress } from 'web3-utils';
import { Transaction, TransactionReceipt } from 'web3-core';
import { RpcManagerDelegate, MultiRpcManager } from '../rpcman';
import { ZkBobState } from '../../state';
import { CommittedForcedExit, ForcedExit, ForcedExitRequest } from '../../emergency';

const RETRY_COUNT = 10;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export enum PoolSelector {
    Transact = "af989083",
    AppendDirectDeposit = "1dc4cb33",
  }

export class EvmNetwork extends MultiRpcManager implements NetworkBackend, RpcManagerDelegate {
    // These properties can be undefined when backend in the disabled state
    private web3?: Web3;
    private pool?: Contract;
    private dd?: Contract;
    private token?: Contract;

    // Local cache
    private tokenSellerAddresses = new Map<string, string>();   // poolContractAddress -> tokenSellerContractAddress
    private ddContractAddresses = new Map<string, string>();    // poolContractAddress -> directDepositContractAddress
    private supportsForcedExit = new Map<string, boolean>();    // poolContractAddress -> isSupportsNonceMethod
    private supportsNonces = new Map<string, boolean>();        // tokenAddress -> isSupportsNonceMethod

    // ------------------------=========< Lifecycle >=========------------------------
    // | Init, enabling and disabling backend                                        |
    // -------------------------------------------------------------------------------

    constructor(rpcUrls: string[], enabled: boolean = true) {
        super(rpcUrls);
        super.delegate = this;

        if (enabled) {
            this.setEnabled(true);
        }
    }

    public isEnabled(): boolean {
        return this.web3 !== undefined &&
                this.pool !== undefined &&
                this.dd !== undefined &&
                this.token !== undefined;
    }

    public setEnabled(enabled: boolean) {
        if (enabled) {
            if (!this.isEnabled()) {
                this.web3 = new Web3(super.curRpcUrl());
                this.pool = new this.web3.eth.Contract(poolContractABI) as unknown as Contract;
                this.dd = new this.web3.eth.Contract(ddContractABI) as unknown as Contract;
                this.token = new this.web3.eth.Contract(tokenABI) as unknown as Contract;
            }
        } else {
            this.web3 = undefined;
            this.pool = undefined;
            this.dd = undefined;
            this.token = undefined;
        }
    }

    private activeWeb3(): Web3 {
        if (!this.web3) {
            throw new InternalError(`EvmNetwork: Cannot interact in the disabled mode`);
        }

        return this.web3;
    }

    private poolContract(): Contract {
        if (!this.pool) {
            throw new InternalError(`EvmNetwork: pool contract object is undefined`);
        }

        return this.pool;
    }

    private directDepositContract(): Contract {
        if (!this.dd) {
            throw new InternalError(`EvmNetwork: direct deposit contract object is undefined`);
        }

        return this.dd;
    }

    private tokenContract(): Contract {
        if (!this.token) {
            throw new InternalError(`EvmNetwork: token contract object is undefined`);
        }

        return this.token;
    }

    private contractCallRetry(contract: Contract, address: string, method: string, args: any[] = []): Promise<any> {
        return this.commonRpcRetry(async () => {
                contract.options.address = address;
                return await contract.methods[method](...args).call()
            },
            `[EvmNetwork] Contract call (${method}) error`,
            RETRY_COUNT
        );
    }

    // -----------------=========< Token-Related Routiness >=========-----------------
    // | Getting balance, allowance, nonce etc                                       |
    // -------------------------------------------------------------------------------

    public async getTokenName(tokenAddress: string): Promise<string> {
        return this.contractCallRetry(this.tokenContract(), tokenAddress, 'name');
    }

    public async getTokenDecimals(tokenAddress: string): Promise<number> {
        const res = await this.contractCallRetry(this.tokenContract(), tokenAddress, 'decimals');
        return Number(res);
    }

    public async getDomainSeparator(tokenAddress: string): Promise<string> {
        return this.contractCallRetry(this.tokenContract(), tokenAddress, 'DOMAIN_SEPARATOR');
    }
    
    public async getTokenNonce(tokenAddress: string, address: string): Promise<number> {
        const res = await this.contractCallRetry(this.tokenContract(), tokenAddress, 'nonces', [address]);
        return Number(res);
    }

    public async getTokenBalance(tokenAddress: string, address: string): Promise<bigint> {    // in token base units
        const res = await this.contractCallRetry(this.tokenContract(), tokenAddress, 'balanceOf', [address]);
        return BigInt(res);
    }

    public async allowance(tokenAddress: string, owner: string, spender: string): Promise<bigint> {
        const res = await this.contractCallRetry(this.tokenContract(), tokenAddress, 'allowance', [owner, spender]);
        return BigInt(res);
    }

    public async permit2NonceBitmap(permit2Address: string, owner: string, wordPos: bigint): Promise<bigint> {
        const res = await this.contractCallRetry(this.tokenContract(), permit2Address, 'nonceBitmap', [owner, wordPos]);
        return BigInt(res);
    }

    public async erc3009AuthState(tokenAddress: string, authorizer: string, nonce: bigint): Promise<bigint> {
        const res = await this.contractCallRetry(this.tokenContract(), tokenAddress, 'authorizationState', [authorizer, `0x${nonce.toString(16)}`]);
        return BigInt(res);
    }

    public async approveTokens(
        tokenAddress: string,
        privateKey: string,
        holder: string,
        spender: string,
        amount: bigint,
        gasFactor?: number
    ): Promise<string> {
        const encodedTx = await this.tokenContract().methods.approve(spender, BigInt(amount)).encodeABI();
        let txObject: TransactionConfig = {
            from: holder,
            to: tokenAddress,
            data: encodedTx,
        };

        const gas = await this.commonRpcRetry(async () => {
            return Number(await this.activeWeb3().eth.estimateGas(txObject));
        }, 'Unable to estimate gas', RETRY_COUNT);
        const gasPrice = await this.commonRpcRetry(async () => {
            return Number(await this.activeWeb3().eth.getGasPrice());
        }, 'Unable to get gas price', RETRY_COUNT);
        txObject.gas = gas;
        txObject.gasPrice = `0x${BigInt(Math.ceil(gasPrice * (gasFactor ?? 1.0))).toString(16)}`;
        txObject.nonce = await this.getNativeNonce(holder);

        const signedTx = await this.activeWeb3().eth.accounts.signTransaction(txObject, privateKey);

        const receipt = await this.commonRpcRetry(async () => {
            return this.activeWeb3().eth.sendSignedTransaction(signedTx.rawTransaction ?? '');
        }, 'Unable to send approve tx', 0); // do not retry sending to avoid any side effects

        return receipt.transactionHash;
    }

    public async isSupportNonce(tokenAddress: string): Promise<boolean> {
        let isSupport = this.supportsNonces.get(tokenAddress);
        if (isSupport === undefined) {
            try {
                const tokenContract = this.tokenContract();
                tokenContract.options.address = tokenAddress;
                await tokenContract.methods['nonces'](ZERO_ADDRESS).call()
                isSupport = true;
            } catch (err) {
                console.warn(`The token seems doesn't support nonces method`);
                isSupport = false;
            }

            this.supportsNonces.set(tokenAddress, isSupport);
        };

        return isSupport
    }


    // ---------------------=========< Pool Interaction >=========--------------------
    // | Getting common info: pool ID, denominator, limits etc                       |
    // -------------------------------------------------------------------------------

    public async getPoolId(poolAddress: string): Promise<number> {
        return Number(await this.contractCallRetry(this.poolContract(), poolAddress, 'pool_id'));
    }

    public async getDenominator(poolAddress: string): Promise<bigint> {
        return BigInt(await this.contractCallRetry(this.poolContract(), poolAddress, 'denominator'));
    }

    public async poolState(poolAddress: string, index?: bigint): Promise<{index: bigint, root: bigint}> {
        let idx: string;
        if (index === undefined) {
            idx = await this.contractCallRetry(this.poolContract(), poolAddress, 'pool_index');
        } else {
            idx = index?.toString();
        }
        let root = BigInt(await this.contractCallRetry(this.poolContract(), poolAddress, 'roots', [idx]));
        if (root == 0n) {
            // it's seems the RPC node got behind the actual blockchain state
            // let's try to find the best one and retry root request
            const switched = await this.switchToTheBestRPC();
            if (switched) {
                root = await this.contractCallRetry(this.poolContract(), poolAddress, 'roots', [idx]);
            }
            if (root == 0n) {
                console.warn(`[EvmNetwork] cannot retrieve root at index ${idx} (is it exist?)`);
            }
        }

        return {index: BigInt(idx), root};
    }

    public async poolLimits(poolAddress: string, address: string | undefined): Promise<any> {
        return await this.contractCallRetry(this.poolContract(), poolAddress, 'getLimitsFor', [address ?? ZERO_ADDRESS]);
    }

    public async isSupportForcedExit(poolAddress: string): Promise<boolean> {
        let isSupport = this.supportsForcedExit.get(poolAddress);
        if (isSupport === undefined) {
            try {
                const poolContract = this.poolContract();
                poolContract.options.address = poolAddress;
                await poolContract.methods['committedForcedExits']('0').call()
                isSupport = true;
            } catch (err) {
                console.warn(`The pool seems doesn't support emergency exit`);
                isSupport = false;
            }

            this.supportsForcedExit.set(poolAddress, isSupport);
        };

        return isSupport;
    }

    public async nullifierValue(poolAddress: string, nullifier: bigint): Promise<bigint> {
        const res = await this.contractCallRetry(this.poolContract(), poolAddress, 'nullifiers', [nullifier]);
        
        return BigInt(res);
    }

    public async committedForcedExits(poolAddress: string, nullifier: bigint): Promise<bigint> {
        const res = await this.contractCallRetry(this.poolContract(), poolAddress, 'committedForcedExits', [nullifier.toString()]);

        return BigInt(res);
    }

    public async createCommitForcedExitTx(poolAddress: string, forcedExit: ForcedExitRequest): Promise<PreparedTransaction> {
        const method = 'commitForcedExit(address,address,uint256,uint256,uint256,uint256,uint256[8])';
        const encodedTx = await this.directDepositContract().methods[method](
            forcedExit.operator,
            forcedExit.to,
            forcedExit.amount.toString(),
            forcedExit.index,
            forcedExit.nullifier.toString(),
            forcedExit.out_commit.toString(),
            [forcedExit.tx_proof.a[0],
             forcedExit.tx_proof.a[1],
             forcedExit.tx_proof.b[0][0],
             forcedExit.tx_proof.b[0][1],
             forcedExit.tx_proof.b[1][0],
             forcedExit.tx_proof.b[1][1],
             forcedExit.tx_proof.c[0],
             forcedExit.tx_proof.c[1],
            ]
        );

        return {
            to: poolAddress,
            amount: 0n,
            data: encodedTx,
        };
    }

    public async createExecuteForcedExitTx(poolAddress: string, forcedExit: CommittedForcedExit): Promise<PreparedTransaction> {
        const method = 'executeForcedExit(uint256,address,address,uint256,uint256,uint256,bool)';
        const encodedTx = await this.directDepositContract().methods[method](
            forcedExit.nullifier.toString(),
            forcedExit.operator,
            forcedExit.to,
            forcedExit.amount.toString(),
            forcedExit.exitStart,
            forcedExit.exitEnd,
            1
        );

        return {
            to: poolAddress,
            amount: 0n,
            data: encodedTx,
        };
    }

    public async createCancelForcedExitTx(poolAddress: string, forcedExit: CommittedForcedExit): Promise<PreparedTransaction> {
        const method = 'executeForcedExit(uint256,address,address,uint256,uint256,uint256,bool)';
        const encodedTx = await this.directDepositContract().methods[method](
            forcedExit.nullifier.toString(),
            forcedExit.operator,
            forcedExit.to,
            forcedExit.amount.toString(),
            forcedExit.exitStart,
            forcedExit.exitEnd,
            0
        );

        return {
            to: poolAddress,
            amount: 0n,
            data: encodedTx,
        };
    }

    public async getTokenSellerContract(poolAddress: string): Promise<string> {
        let tokenSellerAddr = this.tokenSellerAddresses.get(poolAddress);
        if (!tokenSellerAddr) {
            tokenSellerAddr = await this.contractCallRetry(this.poolContract(), poolAddress, 'tokenSeller');
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
            ddContractAddr = await this.contractCallRetry(this.poolContract(), poolAddress, 'direct_deposit_queue');
            if (ddContractAddr) {
                this.ddContractAddresses.set(poolAddress, ddContractAddr);
            } else {
                throw new InternalError(`Cannot fetch DD contract address`);
            }
        }

        return ddContractAddr;
    }

    public async getDirectDepositFee(ddQueueAddress: string): Promise<bigint> {
        const fee = await this.contractCallRetry(this.directDepositContract(), ddQueueAddress, 'directDepositFee');
        return BigInt(fee);
    }

    public async createDirectDepositTx(
        ddQueueAddress: string,
        amount: bigint,
        zkAddress: string,
        fallbackAddress: string,
    ): Promise<PreparedTransaction> {
        const zkAddrBytes = `0x${Buffer.from(bs58.decode(zkAddress.substring(zkAddress.indexOf(':') + 1))).toString('hex')}`;
        const encodedTx = await this.directDepositContract().methods["directDeposit(address,uint256,bytes)"](fallbackAddress, amount, zkAddrBytes).encodeABI();

        return {
            to: ddQueueAddress,
            amount: 0n,
            data: encodedTx,
        };
    }

    public async createNativeDirectDepositTx(
        ddQueueAddress: string,
        nativeAmount: bigint,
        zkAddress: string,
        fallbackAddress: string,
    ): Promise<PreparedTransaction> {
        const zkAddrBytes = `0x${Buffer.from(bs58.decode(zkAddress.substring(zkAddress.indexOf(':') + 1))).toString('hex')}`;
        const encodedTx = await this.directDepositContract().methods["directNativeDeposit(address,bytes)"](fallbackAddress, zkAddrBytes).encodeABI();

        return {
            to: ddQueueAddress,
            amount: nativeAmount,
            data: encodedTx,
        };
    }

    public async getDirectDeposit(ddQueueAddress: string, idx: number, state: ZkBobState): Promise<DirectDeposit | undefined> {
        const ddInfo = await this.contractCallRetry(this.directDepositContract(), ddQueueAddress, 'getDirectDeposit', [idx]);
        const ddStatusCode = Number(ddInfo.status);
        if (ddStatusCode != 0) {
            return {
                id: BigInt(idx),            // DD queue unique identifier
                state: (ddStatusCode - 1) as DirectDepositState,
                amount: BigInt(ddInfo.deposit),        // in pool resolution
                destination: await state.assembleAddress(ddInfo.diversifier, ddInfo.pk),   // zk-addresss
                fee: BigInt(ddInfo.fee),           // relayer fee
                fallback: ddInfo.fallbackReceiver,      // 0x-address to refund DD
                sender: '',        // 0x-address of sender [to the queue]
                queueTimestamp: Number(ddInfo.timestamp), // when it was created
                queueTxHash: '',   // transaction hash to the queue
                //timestamp?: number;    // when it was sent to the pool
                //txHash?: string;       // transaction hash to the pool
                //payment?: DDPaymentInfo;
            };
        } 
        
        return undefined;
    }

    public async getDirectDepositNonce(ddQueueAddress: string): Promise<number> {
        const res = await this.contractCallRetry(this.directDepositContract(), ddQueueAddress, 'directDepositNonce');

        return Number(res);
    }


    // ------------------------=========< Signatures >=========-----------------------
    // | Signing and recovery [ECDSA]                                                |
    // -------------------------------------------------------------------------------

    public async sign(data: any, privKey: string): Promise<string> {
        let keyBuf = Buffer.from(hexToBuf(privKey));
        const signature = personalSign({
            privateKey: keyBuf,
            data: data,
        }); // canonical signature (65 bytes long, LSByte: 1b or 1c)
        keyBuf.fill(0);

        // EVM deployments use compact signatures
        return this.toCompactSignature(signature);
    }

    public async signTypedData(typedData: any, privKey: string): Promise<string> {
        let keyBuf = Buffer.from(hexToBuf(privKey));
        const signature = signTypedData({
            privateKey: keyBuf,
            data: typedData,
            version: SignTypedDataVersion.V4
        }); // canonical signature (65 bytes long, LSByte: 1b or 1c)
        keyBuf.fill(0);

        // EVM deployments use compact signatures
        return this.toCompactSignature(signature);
    }

    public async recoverSigner(data: any, signature: string): Promise<string> {
        const address = await recoverPersonalSignature({
            data: data,
            signature: this.toCanonicalSignature(signature)
        });

        return addHexPrefix(address);
    }

    public async recoverSignerTypedData(typedData: any, signature: string): Promise<string> {
        const address = await recoverTypedSignature({
            data: typedData,
            signature: this.toCanonicalSignature(signature),
            version: SignTypedDataVersion.V4
        });

        return addHexPrefix(address);
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

    public validateAddress(address: string): boolean {
        // Validate a given address:
        //  - it should starts with '0x' prefix
        //  - it should be 20-byte length
        //  - if it contains checksum (EIP-55) it should be valid
        //  - zero addresses are prohibited to withdraw
        return isHexPrefixed(address) && isAddress(address) && address.toLowerCase() != ZERO_ADDRESS;
    }

    public addressFromPrivateKey(privKeyBytes: Uint8Array): string {
        const buf = Buffer.from(privKeyBytes);
        const address = bufferToHex(privateToAddress(buf));
        buf.fill(0);

        return address;
    }

    public addressToBytes(address: string): Uint8Array {
        return hexToBuf(address, 20);
    }

    public bytesToAddress(bytes: Uint8Array): string {
        return addHexPrefix(bufToHex(bytes));
    }

    public isEqualAddresses(addr1: string, addr2: string): boolean {
        return truncateHexPrefix(addr1).toLocaleLowerCase() == truncateHexPrefix(addr2).toLocaleLowerCase();
    }

    public txHashFromHexString(hexString: string): string {
        return addHexPrefix(hexString);
    }

    private async getTransaction(txHash: string): Promise<Transaction> {
        return this.commonRpcRetry(() => {
            return this.activeWeb3().eth.getTransaction(txHash);
        }, 'Cannot get tx', RETRY_COUNT);
    }

    private async getTransactionReceipt(txHash: string): Promise<TransactionReceipt> {
        return this.commonRpcRetry(() => {
            return this.activeWeb3().eth.getTransactionReceipt(txHash);
        }, 'Cannot get tx receipt', RETRY_COUNT);
    }

    public async getTxRevertReason(txHash: string): Promise<string | null> {
        const txReceipt = await this.getTransactionReceipt(txHash);
        if (txReceipt && txReceipt.status !== undefined) {
            if (txReceipt.status == false) {
                const txData = await this.getTransaction(txHash);                
                let reason = 'unknown reason';
                try {
                    await this.activeWeb3().eth.call(txData as TransactionConfig, txData.blockNumber as number);
                } catch(err) {
                    reason = err.message;
                }
                console.log(`getTxRevertReason: revert reason for ${txHash}: ${reason}`)

                return reason;
            } else {
                console.warn(`getTxRevertReason: ${txHash} was not reverted`);
            }
        } else {
            console.warn(`getTxRevertReason: ${txHash} was not mined yet`);
        }

        return null;
    }

    public async getChainId(): Promise<number> {
        return this.commonRpcRetry(async () => {
            return this.activeWeb3().eth.getChainId();
        }, 'Cannot get chain ID', RETRY_COUNT);
    }

    public async getNativeBalance(address: string): Promise<bigint> {
        return this.commonRpcRetry(async () => {
            return BigInt(await this.activeWeb3().eth.getBalance(address));
        }, 'Cannot get native balance', RETRY_COUNT);
    }

    public async getNativeNonce(address: string): Promise<number> {
        return this.commonRpcRetry(async () => {
            return Number(await this.activeWeb3().eth.getTransactionCount(address))
        }, 'Cannot get native nonce', RETRY_COUNT);
    }

    public async getTxDetails(index: number, poolTxHash: string, state: ZkBobState): Promise<PoolTxDetails | null> {
        try {
            const transactionObj = await this.getTransaction(poolTxHash);
            if (transactionObj && transactionObj.blockNumber && transactionObj.input) {
                const txData = truncateHexPrefix(transactionObj.input);
                const block = await this.activeWeb3().eth.getBlock(transactionObj.blockNumber).catch(() => null);
                if (block && block.timestamp) {
                    let timestamp: number = 0;
                    if (typeof block.timestamp === "number" ) {
                        timestamp = block.timestamp;
                    } else if (typeof block.timestamp === "string" ) {
                        timestamp = Number(block.timestamp);
                    }

                    let isMined = false;
                    const txReceipt = await this.getTransactionReceipt(poolTxHash);                    
                    if (txReceipt && txReceipt.status !== undefined && txReceipt.status == true) {
                        isMined = true;
                    }

                    const txSelector = txData.slice(0, 8).toLowerCase();
                    if (txSelector == PoolSelector.Transact) {
                        const tx = decodeEvmCalldata(txData);
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
                                txInfo.depositAddr = await this.recoverSigner(txInfo.nullifier, fullSig);
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
                        txInfo.deposits = [];

                        // get appendDirectDeposits input ABI
                        const ddAbi = poolContractABI.find((val) => val.name == 'appendDirectDeposits');
                        if (ddAbi && ddAbi.inputs) {
                            const decoded = this.activeWeb3().eth.abi.decodeParameters(ddAbi.inputs, txData.slice(8));
                            if (decoded._indices && Array.isArray(decoded._indices) && transactionObj.to) {
                                const ddQueue = await this.getDirectDepositQueueContract(transactionObj.to)
                                const directDeposits = (await Promise.all(decoded._indices.map(async (ddIdx) => {
                                    const dd = await this.getDirectDeposit(ddQueue, Number(ddIdx), state);
                                    const isOwn = dd ? await state.isOwnAddress(dd.destination) : false;
                                    return {dd, isOwn}
                                })))
                                .filter((val) => val.dd && val.isOwn )  // exclude not own DDs
                                .map((val) => {
                                    const aDD = val.dd as DirectDeposit;
                                    aDD.txHash = poolTxHash;
                                    aDD.timestamp = timestamp;
                                    return aDD;
                                });
                                txInfo.deposits = directDeposits;
                            } else {
                                console.error(`Could not decode appendDirectDeposits calldata`);
                            }
                        } else {
                            console.error(`Could not find appendDirectDeposits method input ABI`);
                        }

                        return {
                            poolTxType: PoolTxType.DirectDepositBatch,
                            details: txInfo,
                            index,
                        };
                    } else {
                        throw new InternalError(`[EvmNetwork]: Cannot decode calldata for tx ${poolTxHash} (incorrect selector ${txSelector})`);
                    }
                } else {
                    console.warn(`[EvmNetwork]: cannot get block (${transactionObj.blockNumber}) to retrieve timestamp`);      
                }
            } else {
              console.warn(`[EvmNetwork]: cannot get native tx ${poolTxHash} (tx still not mined?)`);
            }
        } catch (err) {
            console.warn(`[EvmNetwork]: cannot get native tx ${poolTxHash} (${err.message})`);
        }
          
        return null;
    }

    public calldataBaseLength(): number {
        return CALLDATA_BASE_LENGTH;
    }

    public estimateCalldataLength(txType: RegularTxType, notesCnt: number, extraDataLen: number = 0): number {
        return estimateEvmCalldataLength(txType, notesCnt, extraDataLen)
    }

    // ----------------------=========< Syncing >=========----------------------
    // | Getting block number, waiting for a block...                          |
    // -------------------------------------------------------------------------

    public async getBlockNumber(): Promise<number> {
        return this.commonRpcRetry(() => {
            return this.activeWeb3().eth.getBlockNumber();
        }, '[EvmNetwork]: Cannot get block number', RETRY_COUNT);
    }

    public async getBlockNumberFrom(rpcurl: string): Promise<number> {
        const tmpWeb3 = new Web3(rpcurl);
        return this.commonRpcRetry(() => {
            return tmpWeb3.eth.getBlockNumber();
        }, `[EvmNetwork]: Cannot get block number from ${rpcurl}`, 2);
    }

    public async waitForBlock(blockNumber: number, timeoutSec?: number): Promise<boolean> {
        const startTime = Date.now();
        const SWITCH_RPC_DELAY = 30; // force switch RPC node after that time interval (in seconds)
        let curBlock: number;
        let waitMsgLogged = false;
        do {
            curBlock = await this.getBlockNumber().catch(() => 0);

            if (curBlock < blockNumber) {
                if (!waitMsgLogged) {
                    console.warn(`[EvmNetwork]: waiting for a block ${blockNumber} (current ${curBlock})...`);
                    waitMsgLogged = true;
                }

                if (Date.now() > startTime + SWITCH_RPC_DELAY * 1000) {
                    if (await this.switchToTheBestRPC()) {
                        console.warn(`[EvmNetwork]: RPC was auto switched because the block ${blockNumber} was not reached yet`);
                    }
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (Date.now() > startTime + (timeoutSec ?? Number.MAX_SAFE_INTEGER) * 1000) {
                console.warn(`[EvmNetwork]: timeout reached while waiting for a block ${blockNumber} (current block ${curBlock})`)
                return false;
            }
        } while(curBlock < blockNumber);

        if (waitMsgLogged) {
            console.log(`[EvmNetwork]: internal provider was synced with block ${blockNumber}`);
        }

        return true;
    }
}