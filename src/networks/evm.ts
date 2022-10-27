import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract'
import { NetworkBackend } from './network';

export class EvmNetwork implements NetworkBackend {
    contract: Contract;
    token: Contract;
    rpcUrl: string;
    web3: Web3;

    constructor(rpcUrl: string) {
        this.rpcUrl = rpcUrl;

        this.web3 = new Web3(rpcUrl);

        const abi: AbiItem[] = [
            {
                constant: true,
                inputs: [],
                name: 'denominator',
                outputs: [
                    {
                        name: '',
                        type: 'uint256',
                    }
                ],
                stateMutability: 'pure',
                type: 'function',
            }, 
            {
                inputs:[],
                name: 'pool_index',
                outputs: [{
                    internalType: 'uint256',
                    name:'',
                    type:'uint256'
                }],
                stateMutability: 'view',
                type: 'function'
            },
            {
                inputs: [{
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256'
                }],
                name: 'roots',
                outputs: [{
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256'
                }],
                stateMutability: 'view',
                type: 'function'
            },
            {
                inputs: [{
                    internalType: 'address',
                    name: '_user',
                    type: 'address',
                }],
                name: 'getLimitsFor',
                outputs: [{
                    components: [{
                        internalType: 'uint256',
                        name: 'tvlCap',
                        type: 'uint256',
                    }, {
                        internalType: 'uint256',
                        name: 'tvl',
                        type: 'uint256',
                    }, {
                        internalType: 'uint256',
                        name: 'dailyDepositCap',
                        type: 'uint256',
                    }, {
                        internalType: 'uint256',
                        name: 'dailyDepositCapUsage',
                        type: 'uint256',
                    }, {
                        internalType: 'uint256',
                        name: 'dailyWithdrawalCap',
                        type: 'uint256',
                    }, {
                        internalType: 'uint256',
                        name: 'dailyWithdrawalCapUsage',
                        type: 'uint256',
                    }, {
                        internalType: 'uint256',
                        name: 'dailyUserDepositCap',
                        type: 'uint256',
                    }, {
                        internalType: 'uint256',
                        name: 'dailyUserDepositCapUsage',
                        type: 'uint256',
                    }, {
                        internalType: 'uint256',
                        name: 'depositCap',
                        type: 'uint256',
                    }, {
                      internalType: 'uint8',
                      name: 'tier',
                      type: 'uint8',
                    }],
                    internalType: 'struct ZkBobAccounting.Limits',
                    name: '',
                    type: 'tuple'
                }],
                stateMutability: 'view',
                type: 'function',
            }
        ];
        this.contract = new this.web3.eth.Contract(abi) as unknown as Contract;

        // just the Transfer() event definition is sufficient in this case
        const abiTokenJson: AbiItem[] = [
            {
                anonymous: false,
                inputs: [
                    {
                        indexed: true,
                        name: 'from',
                        type: 'address'
                    },
                    {
                        indexed: true,
                        name: 'to',
                        type: 'address'
                    },
                    {
                        indexed: false,
                        name: 'value',
                        type: 'uint256'
                    }
                ],
                name: 'Transfer',
                type: 'event'
            }
        ];
        this.token = new this.web3.eth.Contract(abiTokenJson) as unknown as Contract;
    }

    public async getChainId(): Promise<number> {
        return await this.web3.eth.getChainId();
    }

    public async getDenominator(contractAddress: string): Promise<bigint> {
        this.contract.options.address = contractAddress;
        return BigInt(await this.contract.methods.denominator().call());
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
        this.contract.options.address = contractAddress;
        let addr = address;
        if (address === undefined) {
            addr = '0x0000000000000000000000000000000000000000';
        }
        
        return await this.contract.methods.getLimitsFor(addr).call();
    }

    public async poolState(contractAddress: string): Promise<{index: bigint, root: bigint}> {
        this.contract.options.address = contractAddress;
        const idx = await this.contract.methods.pool_index().call();
        const root = await this.contract.methods.roots(idx).call();


        return {index: BigInt(idx), root: BigInt(root)};
    }

}