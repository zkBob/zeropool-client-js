import { Pool } from "./config";
import { InternalError } from "./errors";
import { NetworkBackend, PreparedTransaction } from "./networks";
import { ZkBobState } from "./state";
import { ZkBobSubgraph } from "./subgraph";
import { DirectDeposit, DirectDepositState } from "./tx";

const DD_FEE_LIFETIME = 3600;
const DD_SCAN_BATCH = 10;    // number of simultaneously request DDs during the manual scan
const DD_SCAN_DEPTH = 10080; // 7 days (in minutes): How old DDd should be searched during the manual scan

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
    protected subgraph?: ZkBobSubgraph;
    protected state: ZkBobState;

    protected tokenAddress: string;
    protected poolAddress: string;
    protected ddQueueContract?: string;
    protected isNativeSupported: boolean;

    protected cachedFee?: FeeFetch;

    // variables for manual DD scanning
    protected lastScannedIndex: number = -1;
    protected directDeposits = new Map<number, DirectDeposit>();
    
    constructor(pool: Pool, network: NetworkBackend, state: ZkBobState, subgraph?: ZkBobSubgraph) {
        this.network = network;
        this.subgraph = subgraph;
        this.state = state;
        this.tokenAddress = pool.tokenAddress;
        this.poolAddress = pool.poolAddress;
        this.isNativeSupported = pool.isNative ?? false;
    }

    public async getQueueContract(): Promise<string> {
        if (!this.ddQueueContract) {
            this.ddQueueContract = await this.network.getDirectDepositQueueContract(this.poolAddress);
        }

        return this.ddQueueContract;
    }

    public async getFee(): Promise<bigint> {

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
        let result: DirectDeposit[] | undefined;
        if (this.subgraph) {
            try {
                result = await this.subgraph.pendingDirectDeposits(this.state)
            } catch (err) {
                console.warn(`Cannot get pending DDs from subgraph: ${err.message}. Falbacking to the direct request`);
            }
        }

        if (result === undefined) {
            try {
                result = await this.manualPendingDirectDepositScan();
            } catch (err) {
                console.warn(`Cannot get pending DDs from contract directly: ${err.message}`);
            }
        }

        return result ?? [];
    }

    protected async manualPendingDirectDepositScan(): Promise<DirectDeposit[]> {
        const ddQueueAddr = await this.getQueueContract();

        // check cached pending DDs and remove not pending ones
        const dds = await Promise.all([...this.directDeposits.keys()].map(async (index) => {
            const dd = await this.network.getDirectDeposit(ddQueueAddr, index, this.state)
            return {index, dd};
        }));
        dds.forEach((val) => {
            if (val.dd && val.dd.state != DirectDepositState.Queued) {
                this.directDeposits.delete(val.index);
            }
        });

        // look for new pending DDs
        const ddNonce = await this.network.getDirectDepositNonce(ddQueueAddr);
        const range = (from, to) => [...Array(to + 1).keys()].slice(from);
        const scanTimestampLimit = (Date.now() / 1000) - (DD_SCAN_DEPTH * 60);
        for (let idx = ddNonce - 1; idx > this.lastScannedIndex; idx -= DD_SCAN_BATCH) {
            const indexes = range(idx - DD_SCAN_BATCH + 1, idx);
            const rangeDDs = (await Promise.all(indexes.map(async (index) => {
                const dd = await this.network.getDirectDeposit(ddQueueAddr, index, this.state);
                const isOwn = dd ? await this.state.isOwnAddress(dd.destination) : false;
                return {index, dd, isOwn};
            })))
            .filter((val) => val.dd !== undefined)
            .map((val) => ({index: val.index, dd: val.dd as DirectDeposit, isOwn: val.isOwn}) );

            rangeDDs.forEach((val) => {
                if (val.dd.state == DirectDepositState.Queued && val.isOwn) {
                    this.directDeposits.set(val.index, val.dd);
                }
            });

            if (rangeDDs.length > 0 && (rangeDDs[0].dd.timestamp ?? 0) < scanTimestampLimit) {
                // scan limit (by timestamp) reached => abort scan
                break;
            }
        }

        this.lastScannedIndex = ddNonce - 1;

        return [...this.directDeposits.values()];
    }

    
}