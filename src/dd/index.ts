import { Pool } from "../config";
import { InternalError } from "../errors";
import { NetworkBackend, PreparedTransaction } from "../networks/network";
import { getBuiltGraphSDK } from "../.graphclient";
import { ZkBobState } from "../state";

const DD_FEE_LIFETIME = 3600;

export enum DirectDepositState {
    Queued,
    Deposited,
    Refunded,
}

export interface DirectDeposit {
    id: bigint;           // DD queue unique identifier
    state: DirectDepositState;
    amount: bigint;       // in pool resolution
    destination: string;  // zk-addresss
    fallback: string;     // 0x-address to refund DD
    timestamp: number;    // when it was created
    queueTxHash: string;  // transaction hash to the queue
}

export enum DirectDepositType {
    Token,  // using directDeposit contract method, amount in the pool token resolution
    Native, // using directNativeDeposit, amount in wei (e.g. native coin for Ethereum mainnet is ETH)
}

interface FeeFetch {
    fee: bigint;
    timestamp: number;  // when the fee was fetched
}

export class DirectDepositProcessor {
    protected network: NetworkBackend;
    protected tokenAddress: string;
    protected poolAddress: string;
    protected ddQueueContract?: string;
    protected isNativeSupported: boolean;
    protected subgraphName?: string;
    protected state: ZkBobState;
    protected sdk;

    protected cachedFee?: FeeFetch;
    
    constructor(pool: Pool, network: NetworkBackend, state: ZkBobState) {
        this.network = network;
        this.tokenAddress = pool.tokenAddress;
        this.poolAddress = pool.poolAddress;
        this.isNativeSupported = pool.isNative ?? false;
        this.subgraphName = pool.ddSubgraph;
        this.state = state;

        this.sdk = getBuiltGraphSDK({
            subgraphName: pool.ddSubgraph,
        })
    }

    public async getQueueContract(): Promise<string> {
        if (!this.ddQueueContract) {
            this.ddQueueContract = await this.network.getDirectDepositQueueContract(this.poolAddress);
        }

        return this.ddQueueContract;
    }

    public async getFee(): Promise<bigint> {
        const queue = await this.getQueueContract();

        let fee = this.cachedFee;
        if (!fee || fee.timestamp + DD_FEE_LIFETIME * 1000 < Date.now()) {
            const queue = await this.getQueueContract();
            const fetchedFee = await this.network.getDirectDepositFee(queue);
            fee = {fee: fetchedFee, timestamp: Date.now()};
            this.cachedFee = fee;
        }

        return fee.fee;
    }

    public async prepareDirectDeposit(
        type: DirectDepositType,
        zkAddress: string,
        amount: bigint, // in native resolution (wei for DirectDepositType.Native)
        fallbackAddress: string,
        feeAlreadyIncluded: boolean = true, // calculate and add required fee amount when false
    ): Promise<PreparedTransaction> {
        if (type == DirectDepositType.Native && !this.isNativeSupported) {
            throw new InternalError(`Native direct deposits are not supported in this pool`);
        }

        const queue = await this.getQueueContract();

        let addedFee = 0n;
        if (!feeAlreadyIncluded) {
            addedFee = await this.getFee();
        }

        switch (type) {
            case DirectDepositType.Token:
                return this.network.createDirectDepositTx(queue, amount + addedFee, zkAddress, fallbackAddress);
                
            case DirectDepositType.Native:
                return this.network.createNativeDirectDepositTx(queue, amount + addedFee, zkAddress, fallbackAddress);       

            default:
                throw new InternalError(`Unsupported direct deposit type ${type}`);
        }
    }

    public async pendingDirectDeposits(): Promise<DirectDeposit[]> {

        if (this.subgraphName !== undefined) {
            const allPendingDDs = await this.sdk.PendingDirectDeposits({}, {
                subgraphName: this.subgraphName,
            }).then((data) => data.directDeposits);

            if (Array.isArray(allPendingDDs)) {
                const myPendingDDs = (await Promise.all(allPendingDDs.map(async (subgraphDD) => {
                    const d = BigInt(subgraphDD.zkAddress_diversifier);
                    const p_d = BigInt(subgraphDD.zkAddress_pk);
                    const zkAddress = await this.state.assembleAddress(d.toString(), p_d.toString());
                    const isOwn = await this.state.isOwnAddress(zkAddress);
                    
                    const dd: DirectDeposit =  {
                        id: BigInt(subgraphDD.id),
                        state: DirectDepositState.Queued,
                        amount: BigInt(subgraphDD.deposit),
                        destination: zkAddress,
                        fallback: subgraphDD.fallbackUser,
                        timestamp: Number(subgraphDD.tsInit),
                        queueTxHash: subgraphDD.txInit,
                    };

                    return {dd, isOwn};
                })))
                .filter((dd) => dd.isOwn)
                .map((myDD) => myDD.dd);

                return myPendingDDs;
            } else {
                throw new InternalError(`Unexpected response from the DD subgraph: ${allPendingDDs}`);
            }
        } else {
            console.warn('There is no configured subraph to query pending DD')
        }

        return [];
    }

    
}