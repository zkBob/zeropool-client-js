import { Chains, ProverMode, Pool, Pools } from "./config";
import { InternalError } from "./errors";
import { EvmNetwork } from "./networks/evm";
import { NetworkType } from "./network-type";
import { NetworkBackend } from "./networks/network";
import { ServiceVersion } from "./services/common";
import { ZkBobDelegatedProver } from "./services/prover";
import { LimitsFetch, ZkBobRelayer } from "./services/relayer";
import { ColdStorageConfig } from "./coldstorage";

const LIB_VERSION = require('../package.json').version;

const DEFAULT_DENOMINATOR = BigInt(1000000000);
const RELAYER_FEE_LIFETIME = 3600;  // when to refetch the relayer fee (in seconds)
const DEFAULT_RELAYER_FEE = BigInt(100000000);
const MIN_TX_AMOUNT = BigInt(50000000);

// relayer fee + fetching timestamp
interface RelayerFeeFetch {
    fee: bigint;
    timestamp: number;  // when the fee was fetched
}

export interface Limit { // all values are in Gwei
    total: bigint;
    available: bigint;
}

export interface PoolLimits { // all values are in Gwei
    deposit: {
        total: bigint;
        components: {
            singleOperation: bigint;
            dailyForAddress: Limit;
            dailyForAll: Limit;
            poolLimit: Limit;
        };
    }
    withdraw: {
        total: bigint;
        components: {
            dailyForAll: Limit;
        };
    }
    tier: number;
}

export interface TreeState {
    root: bigint;
    index: bigint;
}

export interface ChainConfig {
    backend: NetworkBackend;
    networkName: string;
}

export class ZkBobAccountlessClient {
    private chains:         { [chainId: string]: ChainConfig } = {};
    private pools:          { [name: string]: Pool } = {};
    private relayers:       { [name: string]: ZkBobRelayer } = {};
    private provers:        { [name: string]: ZkBobDelegatedProver } = {};
    private proverModes:    { [name: string]: ProverMode } = {};
    private denominators:   { [name: string]: bigint } = {};
    private poolIds:        { [name: string]: number } = {};
    private relayerFee:     { [name: string]: RelayerFeeFetch } = {};
    private coldStorageCfg: { [name: string]: ColdStorageConfig } = {};
    protected supportId: string | undefined;

    // The current pool alias should always be set to ability few accountless operations
    protected curPool: string;

    constructor(pools: Pools, chains: Chains, currentPool: string, supportId: string | undefined) {
        this.supportId = supportId;

        for (const [chainId, chain] of Object.entries(chains)) {
            if (chain.rpcUrls.length == 0) {
                throw new InternalError(`Chain with id ${chainId} being initialized without RPC URL`);
            }
            // TODO: implement multi-RPC NetworkBackend 
            const backend = new EvmNetwork(chain.rpcUrls[0]);
            const networkName = NetworkType.networkName(Number(chainId));
            if (!networkName) {
                throw new InternalError(`The chain with id ${chainId} currently unsupported`);
            }

            this.chains[chainId] = {backend, networkName};
        }

        for (const [alias, pool] of Object.entries(pools)) {
            if (!this.chains[pool.chainId]) {
                throw new InternalError(`Pool ${alias} being initialized with unknown chain id (${pool.chainId})`);
            }

            this.pools[alias] = pool;
            const relayer = ZkBobRelayer.create(pool.relayerUrls, supportId);  // will throw error if relayerUrls is empty
            this.relayers[alias] = relayer;

            // create a delegated prover service if url presented
            if (pool.delegatedProverUrls.length > 0) {
                this.provers[alias] = ZkBobDelegatedProver.create(pool.delegatedProverUrls, supportId);
            }

            this.proverModes[alias] = ProverMode.Local;
        }

        if (!this.pools[currentPool]) {
            throw new InternalError(`Cannot initialize with the unknown current pool (${currentPool})`);
        }
        this.curPool = currentPool;
    }

    // get alias of the currently selected pool
    public currentPool(): string {
        return this.curPool;
    }

    // get all available pool aliases
    public availabePools(): string[] {
        return Object.keys(this.pools);
    }

    protected switchToPool(poolAlias: string) {
        const actualPool = poolAlias ?? this.curPool
        if (!this.pool(actualPool)) {
            throw new InternalError(`Cannot activate unknown pool ${poolAlias}`);
        }
        this.curPool = actualPool;
    }

    protected pool(poolAlias: string | undefined = undefined): Pool {
        const token = this.pools[poolAlias ?? this.curPool];
        if (!token) {
            throw new InternalError(`Unknown pool: ${poolAlias ?? this.curPool}`);
        }

        return token;
    }

    protected network(poolAlias: string | undefined = undefined): NetworkBackend {
        const pool = this.pool(poolAlias);
        const chain = this.chains[pool.chainId];
        if (!chain) {
            throw new InternalError(`Unknown chain with id: ${pool.chainId}`);
        }
        
        return chain.backend;
    }

    public networkName(poolAlias: string | undefined = undefined): string {
        const pool = this.pool(poolAlias);
        const chain = this.chains[pool.chainId];
        if (!chain) {
            throw new InternalError(`Unknown chain with id: ${pool.chainId}`);
        }
        
        return chain.networkName;
    }

    protected relayer(poolAlias: string | undefined = undefined): ZkBobRelayer {
        const relayer = this.relayers[poolAlias ?? this.curPool];
        if (!relayer) {
            throw new InternalError(`No relayer for the pool ${poolAlias ?? this.curPool}`);
        }

        return relayer;
    }

    protected prover(poolAlias: string | undefined = undefined): ZkBobDelegatedProver | undefined {
        return this.provers[poolAlias ?? this.curPool];
    }

    // Pool contract using default denominator 10^9
    // i.e. values less than 1 Gwei are supposed equals zero
    // But this is deployable parameter so this method needed to retrieve it
    protected async denominator(poolAlias: string | undefined = undefined): Promise<bigint> {
        const actualPool = poolAlias ?? this.curPool;
        let denominator = this.denominators[actualPool];
        if (!denominator) {
            try {
                const pool = this.pool(actualPool);
                denominator = await this.network(actualPool).getDenominator(pool.poolAddress);
                this.denominators[actualPool] = denominator;
            } catch (err) {
                console.error(`Cannot fetch denominator value from the relayer, will using default 10^9: ${err}`);
                denominator = DEFAULT_DENOMINATOR;
            }
        }

        return denominator;
    }

    // Each zkBob pool should have his unique identifier
    public async poolId(poolAlias: string | undefined = undefined): Promise<number> {
        const actualPool = poolAlias ?? this.curPool;
        let poolId = this.poolIds[actualPool];
        if (!poolId) {
            try {
                const token = this.pool(actualPool);
                poolId = await this.network(actualPool).getPoolId(token.poolAddress);
                this.poolIds[actualPool] = poolId;
            } catch (err) {
                console.error(`Cannot fetch pool ID, will using default (0): ${err}`);
                poolId = 0;
            }
        }

        return poolId;
    }

    protected async coldStorageConfig(poolAlias: string | undefined = undefined): Promise<ColdStorageConfig | undefined> {
        const actualPoolName = poolAlias ?? this.curPool;
        if (!this.coldStorageCfg[actualPoolName]) {
            const pool = this.pool(actualPoolName);
            if (pool.coldStorageConfigPath) {
                try {
                    let response = await fetch(pool.coldStorageConfigPath);
                    let config: ColdStorageConfig = await response.json();
                    if (config.network.toLowerCase() != this.networkName(actualPoolName).toLowerCase()) {
                    throw new InternalError('Incorrect cold storage configuration');
                    }
                    this.coldStorageCfg[actualPoolName] = config;
                } catch (err) {
                    console.error(`Cannot initialize cold storage: ${err}`);
                }
            }
        }

        return this.coldStorageCfg[actualPoolName];
    }

    protected coldStorageBaseURL(poolAlias: string | undefined = undefined): string | undefined {
        const pool = this.pool(poolAlias);
        if (pool.coldStorageConfigPath) {
            return pool.coldStorageConfigPath.substring(0, pool.coldStorageConfigPath.lastIndexOf('/'));
        }

        return undefined;
    }

    // -------------=========< Converting Amount Routines >=========---------------
    // | Between wei and pool resolution                                          |
    // ----------------------------------------------------------------------------

    // Convert native pool amount to the base units
    public async shieldedAmountToWei(amountShielded: bigint, poolAlias: string | undefined = undefined): Promise<bigint> {
        const denominator = await this.denominator(poolAlias);
        return amountShielded * denominator;
    }
    
    // Convert base units to the native pool amount
    public async weiToShieldedAmount(amountWei: bigint, poolAlias: string | undefined = undefined): Promise<bigint> {
        const denominator = await this.denominator(poolAlias);
        return amountWei / denominator;
    }

    // -------------=========< Transaction configuration >=========----------------
    // | Fees and limits, min tx amount (which are not depend on zkAccount)       |
    // ----------------------------------------------------------------------------

    // Min trensaction fee in Gwei (e.g. deposit or single transfer)
    // To estimate fee in the common case please use feeEstimate instead
    public async atomicTxFee(poolAlias: string | undefined = undefined): Promise<bigint> {
        const relayer = await this.getRelayerFee(poolAlias);
        const l1 = BigInt(0);

        return relayer + l1;
    }

    // Base relayer fee per tx. Do not use it directly, use atomicTxFee instead
    protected async getRelayerFee(poolAlias: string | undefined = undefined): Promise<bigint> {
        const actualPool = poolAlias ?? this.curPool;
        let cachedFee = this.relayerFee[actualPool];
        if (!cachedFee || cachedFee.timestamp + RELAYER_FEE_LIFETIME * 1000 < Date.now()) {
            try {
                const fee = await this.relayers[actualPool].fee()
                cachedFee = {fee, timestamp: Date.now()};
                this.relayerFee[actualPool] = cachedFee;
            } catch (err) {
                console.error(`Cannot fetch relayer fee, will using default (${DEFAULT_RELAYER_FEE}): ${err}`);
                return DEFAULT_RELAYER_FEE;
            }
        }

        return cachedFee.fee;
    }

    public async directDepositFee(poolAlias: string | undefined = undefined): Promise<bigint> {
        const token = this.pool(poolAlias);
        return await this.network(poolAlias).getDirectDepositFee(token.poolAddress);
    }

    public async minTxAmount(): Promise<bigint> {
        return MIN_TX_AMOUNT;
    }

    // The deposit and withdraw amount is limited by few factors:
    // https://docs.zkbob.com/bob-protocol/deposit-and-withdrawal-limits
    // Global limits are fetched from the relayer (except personal deposit limit from the specified address)
    public async getLimits(address: string | undefined, directRequest: boolean = false, poolAlias: string | undefined = undefined): Promise<PoolLimits> {
        const token = this.pool(poolAlias);
        const network = this.network(poolAlias);
        const relayer = this.relayer(poolAlias);

        async function fetchLimitsFromContract(network: NetworkBackend): Promise<LimitsFetch> {
            const poolLimits = await network.poolLimits(token.poolAddress, address);
            return {
                deposit: {
                    singleOperation: BigInt(poolLimits.depositCap),
                    dailyForAddress: {
                        total: BigInt(poolLimits.dailyUserDepositCap),
                        available: BigInt(poolLimits.dailyUserDepositCap) - BigInt(poolLimits.dailyUserDepositCapUsage),
                    },
                    dailyForAll: {
                        total:      BigInt(poolLimits.dailyDepositCap),
                        available:  BigInt(poolLimits.dailyDepositCap) - BigInt(poolLimits.dailyDepositCapUsage),
                    },
                    poolLimit: {
                        total:      BigInt(poolLimits.tvlCap),
                        available:  BigInt(poolLimits.tvlCap) - BigInt(poolLimits.tvl),
                    },
                },
                withdraw: {
                    dailyForAll: {
                        total:      BigInt(poolLimits.dailyWithdrawalCap),
                        available:  BigInt(poolLimits.dailyWithdrawalCap) - BigInt(poolLimits.dailyWithdrawalCapUsage),
                    },
                },
                tier: poolLimits.tier === undefined ? 0 : Number(poolLimits.tier)
            };
        }

        function defaultLimits(): LimitsFetch {
            // hardcoded values
            return {
                deposit: {
                    singleOperation: BigInt(10000000000000),  // 10k tokens
                    dailyForAddress: {
                        total: BigInt(10000000000000),  // 10k tokens
                        available: BigInt(10000000000000),  // 10k tokens
                    },
                    dailyForAll: {
                        total:      BigInt(100000000000000),  // 100k tokens
                        available:  BigInt(100000000000000),  // 100k tokens
                    },
                    poolLimit: {
                        total:      BigInt(1000000000000000), // 1kk tokens
                        available:  BigInt(1000000000000000), // 1kk tokens
                    },
                },
                withdraw: {
                    dailyForAll: {
                        total:      BigInt(100000000000000),  // 100k tokens
                        available:  BigInt(100000000000000),  // 100k tokens
                    },
                },
                tier: 0
            };
        }

        // Fetch limits in the requested order
        let currentLimits: LimitsFetch;
        if (directRequest) {
            try {
                currentLimits = await fetchLimitsFromContract(network);
            } catch (e) {
                console.warn(`Cannot fetch limits from the contract (${e}). Try to get them from relayer`);
                try {
                    currentLimits = await relayer.limits(address);
                } catch (err) {
                    console.warn(`Cannot fetch limits from the relayer (${err}). Getting hardcoded values. Please note your transactions can be reverted with incorrect limits!`);
                    currentLimits = defaultLimits();
                }
            }
        } else {
            try {
                currentLimits = await relayer.limits(address);
            } catch (e) {
                console.warn(`Cannot fetch deposit limits from the relayer (${e}). Try to get them from contract directly`);
                try {
                    currentLimits = await fetchLimitsFromContract(network);
                } catch (err) {
                    console.warn(`Cannot fetch deposit limits from contract (${err}). Getting hardcoded values. Please note your transactions can be reverted with incorrect limits!`);
                    currentLimits = defaultLimits();
                }
            }
        }

        // helper
        const bigIntMin = (...args: bigint[]) => args.reduce((m, e) => e < m ? e : m);

        // Calculate deposit limits
        const allDepositLimits = [
            currentLimits.deposit.singleOperation,
            currentLimits.deposit.dailyForAddress.available,
            currentLimits.deposit.dailyForAll.available,
            currentLimits.deposit.poolLimit.available,
        ];
        const totalDepositLimit = bigIntMin(...allDepositLimits);

        // Calculate withdraw limits
        const allWithdrawLimits = [ currentLimits.withdraw.dailyForAll.available ];
        const totalWithdrawLimit = bigIntMin(...allWithdrawLimits);

        return {
            deposit: {
                total: totalDepositLimit >= 0 ? totalDepositLimit : BigInt(0),
                components: currentLimits.deposit,
            },
            withdraw: {
                total: totalWithdrawLimit >= 0 ? totalWithdrawLimit : BigInt(0),
                components: currentLimits.withdraw,
            },
            tier: currentLimits.tier
        }
    }

    // --------------=========< Common Prover Routines >=========------------------
    // | Support fo switching between different proving modes                     |
    // ----------------------------------------------------------------------------
    public async setProverMode(mode: ProverMode, poolAlias: string | undefined = undefined) {
        if (!Object.values(ProverMode).includes(mode)) {
            throw new InternalError("Provided mode isn't correct. Possible modes: Local, Delegated, and DelegatedWithFallback");
        }

        const actualPool = poolAlias ?? this.curPool;
        const prover = this.prover(actualPool);

        if (mode == ProverMode.Delegated || mode == ProverMode.DelegatedWithFallback) {
            if (!prover) {
                this.proverModes[actualPool] = ProverMode.Local;
                throw new InternalError(`Delegated prover can't be enabled because delegated prover url wasn't provided`)
            }

            if ((await prover.healthcheck()) == false) {
                this.proverModes[actualPool] = ProverMode.Local;
                throw new InternalError(`Delegated prover can't be enabled because delegated prover isn't healthy`)
            }
        }

        this.proverModes[actualPool] = mode;
    }
    
    public getProverMode(poolAlias: string | undefined = undefined): ProverMode {
        const actualPool = poolAlias ?? this.curPool;
        const mode = this.proverModes[actualPool];
        if (!mode) {
            throw new InternalError(`No prover mode set for the pool ${actualPool}`);
        }

        return mode;
    }

    // ------------------=========< State Processing >=========--------------------
    // | Getting the remote state (from the relayer and pool)                     |
    // ----------------------------------------------------------------------------

    // Get relayer regular root & index
    public async getRelayerState(poolAlias: string | undefined = undefined): Promise<TreeState> {
        const relayer = this.relayer(poolAlias);
        const info = await relayer.info();

        return {root: BigInt(info.root), index: info.deltaIndex};
    }

    // Get relayer optimistic root & index
    public async getRelayerOptimisticState(poolAlias: string | undefined = undefined): Promise<TreeState> {
        const relayer = this.relayer(poolAlias);
        const info = await relayer.info();

        return {root: BigInt(info.optimisticRoot), index: info.optimisticDeltaIndex};
    }

    // Get pool info (direct web3 request)
    public async getPoolState(index?: bigint, poolAlias: string | undefined = undefined): Promise<TreeState> {
        const token = this.pool(poolAlias);
        const res = await this.network(poolAlias).poolState(token.poolAddress, index);

        return {index: res.index, root: res.root};
    }

    // --------------------=========< Versioning >=========------------------------
    // | Miscellaneous version information                                        |
    // ----------------------------------------------------------------------------

    public getLibraryVersion(): string {
        return LIB_VERSION;
    }

    public async getRelayerVersion(poolAlias: string | undefined = undefined): Promise<ServiceVersion> {
        return this.relayer(poolAlias).version();
    }

    public async getProverVersion(poolAlias: string | undefined = undefined): Promise<ServiceVersion> {
        const prover = this.prover(poolAlias)
        if (!prover) {
            throw new InternalError(`Cannot fetch prover version because delegated prover wasn't initialized for the pool ${poolAlias ?? this.curPool}`);
        }
        
        return prover.version();
    }
}