

export interface BulkInfo {
    index_from: BigInt,
    next_index: BigInt,
    filename: string,
    bytes: number,
    tx_count: number,
    timestamp: BigInt,
}


export interface ColdStorageConfig {
    network: string,
    index_from: BigInt,
    next_index: BigInt,
    total_txs_count: number,
    bulks: BulkInfo[],
}