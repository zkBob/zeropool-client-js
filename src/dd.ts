import { Pool } from "./config";
import { InternalError } from "./errors";
import { NetworkBackend, PreparedTransaction } from "./networks/network";

const DD_FEE_LIFETIME = 3600;

export interface DirectDeposit {
    amount: bigint;       // in pool resolution
    destination: string;  // zk-addresss
    timestamp: number;    // when it was created
  
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
    protected supportId: string | undefined;

    protected cachedFee?: FeeFetch;
    
    constructor(pool: Pool, network: NetworkBackend, supportId: string | undefined) {
        this.network = network;
        this.tokenAddress = pool.tokenAddress;
        this.poolAddress = pool.poolAddress;
        this.isNativeSupported = pool.isNative ?? false;
        this.supportId = supportId;
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
}