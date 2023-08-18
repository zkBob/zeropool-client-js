import { getBuiltGraphSDK } from "../.graphclient";
import { hostedServiceDefaultURL } from "./resolvers";
import { ZkBobState } from "../state";
import { InternalError } from "../errors";
import { DDBatchTxDetails, DirectDeposit, DirectDepositState,
         PoolTxDetails, PoolTxType, RegularTxDetails, RegularTxType
        } from "../tx";


export class ZkBobSubgraph {
    protected subgraph: string; // a name on the Hosted Service or full URL
    protected sdk;

    constructor(subgraphNameOrUrl: string) {
        this.subgraph = subgraphNameOrUrl;

        this.sdk = getBuiltGraphSDK({
            subgraphEndpoint: this.subgraphEndpoint(),
        })
    }

    protected subgraphEndpoint(): string | undefined {
        if (this.subgraph) {
            if (this.subgraph.indexOf('/') == -1) {
                return `${hostedServiceDefaultURL}${this.subgraph}`;
            }
        }

        return this.subgraph;
    }

    protected async parseSubraphDD(subraphDD: any, state: ZkBobState): Promise<DirectDeposit> {
        let ddState: DirectDepositState;
        if (subraphDD.pending) {
            ddState = DirectDepositState.Queued;
        } else if (subraphDD.refunded) {
            ddState = DirectDepositState.Refunded;
        } else if (subraphDD.completed) {
            ddState = DirectDepositState.Deposited;
        } else {
            throw new InternalError(`Incorrect state for direct deposit ${subraphDD.id}`);
        }

        const d = BigInt(subraphDD.zkAddress_diversifier);
        const p_d = BigInt(subraphDD.zkAddress_pk);
        const zkAddress = await state.assembleAddress(d.toString(), p_d.toString());

        const appDD: DirectDeposit =  {
            id: BigInt(subraphDD.id),
            state: ddState,
            amount: BigInt(subraphDD.deposit),
            destination: zkAddress,
            fallback: subraphDD.fallbackUser,
            sender: subraphDD.sender,
            queueTimestamp: Number(subraphDD.tsInit),
            queueTxHash: subraphDD.txInit,
            timestamp: subraphDD.tsClosed ? Number(subraphDD.tsClosed) : undefined,
            txHash: subraphDD.txClosed,
        };

        return appDD;
    }

    public async fetchDirectDeposit(id: bigint, state: ZkBobState): Promise<DirectDeposit | undefined> {
        const requestedDD = await this.sdk.DirectDepositById({ 'id': id }, {
            subgraphEndpoint: this.subgraphEndpoint(),
        }).then((data) => data.directDeposit);

        if (requestedDD) {
            return this.parseSubraphDD(requestedDD, state);   
        }

        return undefined;
    }

    public async pendingDirectDeposits(state: ZkBobState): Promise<DirectDeposit[]> {
        const allPendingDDs = await this.sdk.PendingDirectDeposits({}, {
            subgraphEndpoint: this.subgraphEndpoint(),
        }).then((data) => data.directDeposits);

        if (Array.isArray(allPendingDDs)) {
            const myPendingDDs = (await Promise.all(allPendingDDs.map(async (subgraphDD) => {
                const dd = await this.parseSubraphDD(subgraphDD, state);
                const isOwn = await state.isOwnAddress(dd.destination);

                return {dd, isOwn};
            })))
            .filter((dd) => dd.isOwn)
            .map((myDD) => myDD.dd);

            return myPendingDDs;
        } else {
            throw new InternalError(`Unexpected response from the DD subgraph: ${allPendingDDs}`);
        }
    }

    public async getTxDetails(index: number, state: ZkBobState): Promise<PoolTxDetails | null> {
        const tx = await this.sdk.PoolTxByIndex({ 'id': index }, {
            subgraphEndpoint: this.subgraphEndpoint(),
        }).then((data) => data.poolTx);

        if (tx) {
            if (tx.type != 100) {
                // regular pool transaction
                const txDetails = new RegularTxDetails();
                txDetails.txHash = tx.tx;
                txDetails.isMined = true;   // subgraph returns only mined txs
                txDetails.timestamp = Number(tx.ts);
                txDetails.feeAmount = BigInt(tx.operation.fee);
                txDetails.nullifier = tx.operation.nullifier;
                txDetails.commitment = tx.zk.out_commit;
                txDetails.ciphertext = tx.message
                if (tx.type == 0) {
                    // deposit via approve
                    txDetails.txType = RegularTxType.Deposit;
                    txDetails.tokenAmount = BigInt(tx.operation.token_amount)
                    // TODO: restore sender from signature!;
                } else if (tx.type == 1) {
                    // transfer
                    txDetails.txType = RegularTxType.Transfer;
                    txDetails.tokenAmount = -txDetails.feeAmount;
                } else if (tx.type == 2) {
                    // withdrawal
                    txDetails.txType = RegularTxType.Withdraw;
                    txDetails.tokenAmount = tx.operation.token_amount;
                    txDetails.withdrawAddr = tx.operation.receiver;
                } else if (tx.type == 3) {
                    // deposit via permit
                    txDetails.txType = RegularTxType.BridgeDeposit;
                    txDetails.tokenAmount = tx.operation.token_amount;
                    txDetails.depositAddr = tx.operation.permit_holder;
                } else {
                    throw new InternalError(`Incorrect tx type from subgraph (${tx.type})`)
                }

                return { poolTxType: PoolTxType.Regular, details: txDetails };
            } else {
                // direct deposit batch
                const txDetails = new DDBatchTxDetails();
                txDetails.txHash = tx.tx;
                txDetails.isMined = true;   // subgraph returns only mined txs
                txDetails.timestamp = Number(tx.ts);
                
                const DDs = tx.operation.delegated_deposits
                if (Array.isArray(DDs)) {
                    txDetails.deposits = await Promise.all(DDs.map((aSubgraphDD) => {
                        return this.parseSubraphDD(aSubgraphDD, state);
                    }));
                } else {
                    throw new InternalError(`Incorrect tx type from subgraph (${tx.type})`)
                }

                return { poolTxType: PoolTxType.DirectDepositBatch, details: txDetails };
            }
        }

        return null;
    }
}