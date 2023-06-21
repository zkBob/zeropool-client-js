import Web3 from 'web3';
import { Contract } from 'web3-eth-contract'
import { TransactionConfig } from 'web3-core'
import { NetworkBackend } from './network';
import { InternalError } from '..';
import { ddContractABI, poolContractABI, tokenABI } from './evm-abi';

export class EvmNetwork implements NetworkBackend {
    rpcUrl: string;

    // these properties can be undefined when backend in disabled state
    private web3?: Web3;
    private pool?: Contract;
    private dd?: Contract;
    private token?: Contract;

    private ddContractAddresses = new Map<string, string>();    // poolContractAddress -> directDepositContractAddress

    constructor(rpcUrl: string, enabled: boolean = true) {
        this.rpcUrl = rpcUrl;

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
                this.web3 = new Web3(this.rpcUrl);
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

    public async getChainId(): Promise<number> {
        return await this.activeWeb3().eth.getChainId();
    }

    public async getTokenName(tokenAddress: string): Promise<string> {
        this.tokenContract().options.address = tokenAddress;
        return await this.tokenContract().methods.name().call();
    }

    public async getTokenDecimals(tokenAddress: string): Promise<number> {
        this.tokenContract().options.address = tokenAddress;
        return Number(await this.tokenContract().methods.decimals().call());
    }
    
    public async getTokenNonce(tokenAddress: string, address: string): Promise<number> {
        this.tokenContract().options.address = tokenAddress;
        return Number(await this.tokenContract().methods.nonces(address).call());
    }

    public async getTokenBalance(tokenAddress: string, address: string): Promise<bigint> {    // in wei
        this.tokenContract().options.address = tokenAddress;
        return BigInt(await this.tokenContract().methods.balanceOf(address).call());
    }

    public async allowance(tokenAddress: string, owner: string, spender: string): Promise<bigint> {
        this.tokenContract().options.address = tokenAddress;
        const result = await this.tokenContract().methods.allowance(owner, spender).call();
    
        return BigInt(result);
    }

    public async permit2NonceBitmap(permit2Address: string, owner: string, wordPos: bigint): Promise<bigint> {
        this.tokenContract().options.address = permit2Address;
        const result = await this.tokenContract().methods.nonceBitmap(owner, wordPos).call();

        return BigInt(result);
    }

    public async erc3009AuthState(tokenAddress: string, authorizer: string, nonce: bigint): Promise<bigint> {
        this.tokenContract().options.address = tokenAddress;
        const result = await this.tokenContract().methods.authorizationState(authorizer, `0x${nonce.toString(16)}`).call();

        return BigInt(result);
    }

    public async getDenominator(contractAddress: string): Promise<bigint> {
        this.poolContract().options.address = contractAddress;
        return BigInt(await this.poolContract().methods.denominator().call());
    }

    public async getPoolId(contractAddress: string): Promise<number> {
        this.poolContract().options.address = contractAddress;
        return Number(await this.poolContract().methods.pool_id().call());
    }

    isSignatureCompact(): boolean {
        return true;
    }

    defaultNetworkName(): string {
        return 'ethereum';
    }

    getRpcUrl(): string {
        return this.rpcUrl;
    }

    public async poolLimits(contractAddress: string, address: string | undefined): Promise<any> {
        this.poolContract().options.address = contractAddress;
        let addr = address;
        if (address === undefined) {
            addr = '0x0000000000000000000000000000000000000000';
        }
        
        return await this.poolContract().methods.getLimitsFor(addr).call();
    }

    public async getDirectDepositFee(contractAddress: string): Promise<bigint> {
        let ddContractAddr = this.ddContractAddresses.get(contractAddress);
        if (!ddContractAddr) {
            this.poolContract().options.address = contractAddress;
            ddContractAddr = await this.poolContract().methods.direct_deposit_queue().call();
            if (ddContractAddr) {
                this.ddContractAddresses.set(contractAddress, ddContractAddr);
            } else {
                throw new InternalError(`Cannot fetch DD contract address`);
            }
        }

        this.directDepositContract().options.address = ddContractAddr;
        
        return BigInt(await this.directDepositContract().methods.directDepositFee().call());
    }

    public async poolState(contractAddress: string, index?: bigint): Promise<{index: bigint, root: bigint}> {
        this.poolContract().options.address = contractAddress;
        let idx;
        if (index === undefined) {
            idx = await this.poolContract().methods.pool_index().call();
        } else {
            idx = index?.toString();
        }
        const root = await this.poolContract().methods.roots(idx).call();


        return {index: BigInt(idx), root: BigInt(root)};
    }

    public async getTxRevertReason(txHash: string): Promise<string | null> {
        const txReceipt = await this.activeWeb3().eth.getTransactionReceipt(txHash);
        if (txReceipt && txReceipt.status !== undefined) {
            if (txReceipt.status == false) {
                const txData = await this.activeWeb3().eth.getTransaction(txHash);
                
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

}