import Web3 from 'web3';
import { TransactionData, SnarkProof, UserAccount, VK } from 'libzeropool-rs-wasm-web';
export declare class InvalidNumberOfOutputs extends Error {
    numOutputs: number;
    constructor(numOutputs: number);
}
export declare enum TxType {
    Deposit = "0000",
    Transfer = "0001",
    Withdraw = "0002",
    BridgeDeposit = "0003"
}
export declare function txTypeToString(txType: TxType): string;
/** The universal transaction data format used on most networks. */
export declare class ShieldedTx {
    selector: string;
    nullifier: bigint;
    outCommit: bigint;
    transferIndex: bigint;
    energyAmount: bigint;
    tokenAmount: bigint;
    transactProof: bigint[];
    rootAfter: bigint;
    treeProof: bigint[];
    txType: TxType;
    memo: string;
    extra: string;
    static fromData(txData: TransactionData, txType: TxType, acc: UserAccount, snarkParams: {
        transferVk?: VK;
        treeVk?: VK;
    }, web3: Web3, worker: any): Promise<ShieldedTx>;
    get ciphertext(): string;
    get hashes(): string[];
    /**
     * Returns encoded transaction ready to use as data for the smart contract.
     */
    encode(): string;
    static decode(data: string): ShieldedTx;
}
export declare function parseHashes(ciphertext: string): string[];
export declare function flattenSnarkProof(p: SnarkProof): bigint[];
