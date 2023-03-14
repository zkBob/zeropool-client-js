import { ProverMode, Token, Tokens } from "./config";
import { InternalError } from "./errors";
import { NetworkBackend } from "./networks/network";
import { ServiceVersion } from "./services/common";
import { ZkBobDelegatedProver } from "./services/prover";
import { LimitsFetch, ZkBobRelayer } from "./services/relayer";

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

export class ZkBobAccountlessClient {
    private tokens:       { [tokenAddress: string]: Token } = {};
    private relayers:     { [tokenAddress: string]: ZkBobRelayer } = {};
    private provers:      { [tokenAddress: string]: ZkBobDelegatedProver } = {};
    private proverModes:  { [tokenAddress: string]: ProverMode } = {};
    private denominators: { [tokenAddress: string]: bigint } = {};
    private poolIds:      { [tokenAddress: string]: number } = {};
    private relayerFee:   { [tokenAddress: string]: RelayerFeeFetch } = {};
    protected supportId: string | undefined;
    protected network: NetworkBackend;

    constructor(tokens: Tokens, supportId: string | undefined, network: NetworkBackend) {
        this.supportId = supportId;
        this.network = network;
        for (const [address, token] of Object.entries(tokens)) {
            this.tokens[address] = token;
            const relayer = ZkBobRelayer.create([token.relayerUrl], supportId);
            this.relayers[address] = relayer;

            // create a delegated prover service if url presented
            if (token.delegatedProverUrl) {
                this.provers[address] = ZkBobDelegatedProver.create([token.delegatedProverUrl], supportId);
            }

            this.proverModes[address] = ProverMode.Local;
        }
    }

    protected token(tokenAddress: string): Token {
        const token = this.tokens[tokenAddress];
        if (!token) {
            throw new InternalError(`Unknown token: ${tokenAddress}`);
        }

        return token;
    }

    protected relayer(tokenAddress: string): ZkBobRelayer {
        const relayer = this.relayers[tokenAddress];
        if (!relayer) {
            throw new InternalError(`No relayer for token: ${tokenAddress}`);
        }

        return relayer;
    }

    protected prover(tokenAddress: string): ZkBobDelegatedProver | undefined {
        return this.provers[tokenAddress];
    }

    // Pool contract using default denominator 10^9
    // i.e. values less than 1 Gwei are supposed equals zero
    // But this is deployable parameter so this method needed to retrieve it
    protected async denominator(tokenAddress: string): Promise<bigint> {
        let denominator = this.denominators[tokenAddress];
        if (!denominator) {
            try {
                const token = this.token(tokenAddress);
                denominator = await this.network.getDenominator(token.poolAddress);
                this.denominators[tokenAddress] = denominator;
            } catch (err) {
                console.error(`Cannot fetch denominator value from the relayer, will using default 10^9: ${err}`);
                denominator = DEFAULT_DENOMINATOR;
            }
        }

        return denominator;
    }

    // Each zkBob pool should have his unique identifier
    protected async poolId(tokenAddress: string): Promise<number> {
        let poolId = this.poolIds[tokenAddress];
        if (!poolId) {
            try {
                const token = this.token(tokenAddress);
                poolId = await this.network.getPoolId(token.poolAddress);
                this.poolIds[tokenAddress] = poolId;
            } catch (err) {
                console.error(`Cannot fetch pool ID, will using default (0): ${err}`);
                poolId = 0;
            }
        }

        return poolId;
    }

    // -------------=========< Converting Amount Routines >=========---------------
    // | Between wei and pool resolution                                          |
    // ----------------------------------------------------------------------------

    // Convert native pool amount to the base units
    public async shieldedAmountToWei(tokenAddress, amountGwei: bigint):Promise<bigint> {
        const denominator = await this.denominator(tokenAddress);
        return amountGwei * denominator;
    }
    
    // Convert base units to the native pool amount
    public async weiToShieldedAmount(tokenAddress, amountWei: bigint): Promise<bigint> {
        const denominator = await this.denominator(tokenAddress);
        return amountWei / denominator;
    }

    // -------------=========< Transaction configuration >=========----------------
    // | Fees and limits, min tx amount (which are not depend on zkAccount)       |
    // ----------------------------------------------------------------------------

    // Min trensaction fee in Gwei (e.g. deposit or single transfer)
    // To estimate fee in the common case please use feeEstimate instead
    public async atomicTxFee(tokenAddress: string): Promise<bigint> {
        const relayer = await this.getRelayerFee(tokenAddress);
        const l1 = BigInt(0);

        return relayer + l1;
    }

    // Base relayer fee per tx. Do not use it directly, use atomicTxFee instead
    protected async getRelayerFee(tokenAddress: string): Promise<bigint> {
        let cachedFee = this.relayerFee[tokenAddress];
        if (!cachedFee || cachedFee.timestamp + RELAYER_FEE_LIFETIME * 1000 < Date.now()) {
            try {
                const fee = await this.relayers[tokenAddress].fee()
                cachedFee = {fee, timestamp: Date.now()};
                this.relayerFee[tokenAddress] = cachedFee;
            } catch (err) {
                console.error(`Cannot fetch relayer fee, will using default (${DEFAULT_RELAYER_FEE}): ${err}`);
                return DEFAULT_RELAYER_FEE;
            }
        }

        return cachedFee.fee;
    }

    public async directDepositFee(tokenAddress: string): Promise<bigint> {
        const token = this.token(tokenAddress);
        return await this.network.getDirectDepositFee(token.poolAddress);
    }

    public async minTxAmount(): Promise<bigint> {
        return MIN_TX_AMOUNT;
    }

    // The deposit and withdraw amount is limited by few factors:
    // https://docs.zkbob.com/bob-protocol/deposit-and-withdrawal-limits
    // Global limits are fetched from the relayer (except personal deposit limit from the specified address)
    public async getLimits(tokenAddress: string, address: string | undefined = undefined, directRequest: boolean = false): Promise<PoolLimits> {
        const token = this.tokens[tokenAddress];
        const relayer = this.relayers[tokenAddress];

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
                currentLimits = await fetchLimitsFromContract(this.network);
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
                    currentLimits = await fetchLimitsFromContract(this.network);
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
    public async setProverMode(tokenAddress: string, mode: ProverMode) {
        if (!Object.values(ProverMode).includes(mode)) {
            throw new InternalError("Provided mode isn't correct. Possible modes: Local, Delegated, and DelegatedWithFallback");
        }

        const prover = this.provers[tokenAddress];
        if (mode == ProverMode.Delegated || mode == ProverMode.DelegatedWithFallback) {
            if (!prover) {
                this.proverModes[tokenAddress] = ProverMode.Local;
                throw new InternalError(`Delegated prover can't be enabled because delegated prover url wasn't provided`)
            }

            if ((await prover.healthcheck()) == false) {
                this.proverModes[tokenAddress] = ProverMode.Local;
                throw new InternalError(`Delegated prover can't be enabled because delegated prover isn't healthy`)
            }
        }

        this.proverModes[tokenAddress] = mode;
    }
    
    public getProverMode(tokenAddress: string): ProverMode {
        return this.proverModes[tokenAddress];
    }

    // ------------------=========< State Processing >=========--------------------
    // | Getting the remote state (from the relayer and pool)                     |
    // ----------------------------------------------------------------------------

    // Get relayer regular root & index
    public async getRelayerState(tokenAddress: string): Promise<TreeState> {
        const relayer = this.relayers[tokenAddress];
        const info = await relayer.info();

        return {root: BigInt(info.root), index: info.deltaIndex};
    }

    // Get relayer optimistic root & index
    public async getRelayerOptimisticState(tokenAddress: string): Promise<TreeState> {
        const relayer = this.relayers[tokenAddress];
        const info = await relayer.info();

        return {root: BigInt(info.optimisticRoot), index: info.optimisticDeltaIndex};
    }

    // Get pool info (direct web3 request)
    public async getPoolState(tokenAddress: string, index?: bigint): Promise<TreeState> {
        const token = this.tokens[tokenAddress];
        const res = await this.network.poolState(token.poolAddress, index);

        return {index: res.index, root: res.root};
    }

    // --------------------=========< Versioning >=========------------------------
    // | Miscellaneous version information                                        |
    // ----------------------------------------------------------------------------

    public getLibraryVersion(): string {
        return LIB_VERSION;
    }

    public async getRelayerVersion(tokenAddress: string): Promise<ServiceVersion> {
        return this.relayers[tokenAddress].version();
    }

    public async getProverVersion(tokenAddress: string, cached: boolean = true): Promise<ServiceVersion> {
        if (!this.provers[tokenAddress]) {
            throw new InternalError("Cannot fetch prover version because delegated prover url wasn't provided");
        }
        
        return this.provers[tokenAddress].version();
    }
}