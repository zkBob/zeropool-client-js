import { TxType } from "../tx";
import { hexToNode } from "../utils";
import { InternalError, ServiceError } from "../errors";
import { IZkBobService, ServiceType,
         ServiceVersion, isServiceVersion, ServiceVersionFetch,
         defaultHeaders, fetchJson,
        } from "./common";
import { Proof, TreeNode } from 'libzkbob-rs-wasm-web';

const RELAYER_VERSION_REQUEST_THRESHOLD = 3600; // relayer's version expiration (in seconds)

export interface TxToRelayer {
  txType: TxType;
  memo: string;
  proof: Proof;
  depositSignature?: string
}

export interface JobInfo {
  resolvedJobId: string;
  state: string;
  txHash: string | null;
  createdOn: number;
  finishedOn: number | null;
  failedReason: string | null;
}
const isJobInfo = (obj: any): obj is JobInfo => {
  return typeof obj === 'object' && obj !== null &&
    obj.hasOwnProperty('state') && typeof obj.state === 'string' &&
    obj.hasOwnProperty('txHash') && (!obj.txHash || typeof obj.state === 'string') &&
    obj.hasOwnProperty('resolvedJobId') && typeof obj.resolvedJobId === 'string' &&
    obj.hasOwnProperty('createdOn') && typeof obj.createdOn === 'number';
}

export interface RelayerInfo {
  root: string;
  optimisticRoot: string;
  deltaIndex: bigint;
  optimisticDeltaIndex: bigint;
}

const isRelayerInfo = (obj: any): obj is RelayerInfo => {
  return typeof obj === 'object' && obj !== null &&
    obj.hasOwnProperty('root') && typeof obj.root === 'string' &&
    obj.hasOwnProperty('optimisticRoot') && typeof obj.optimisticRoot === 'string' &&
    obj.hasOwnProperty('deltaIndex') && typeof obj.deltaIndex === 'number' &&
    obj.hasOwnProperty('optimisticDeltaIndex') && typeof obj.optimisticDeltaIndex === 'number';
}

export interface RelayerFee {
  fee: {
    deposit: bigint;
    transfer: bigint;
    withdrawal: bigint;
    permittableDeposit: bigint;
  };
  oneByteFee: bigint;
}

interface Limit { // all values are in Gwei
  total: bigint;
  available: bigint;
}

export interface LimitsFetch { 
  deposit: {
    singleOperation: bigint;
    dailyForAddress: Limit;
    dailyForAll: Limit;
    poolLimit: Limit;
  }
  withdraw: {
    dailyForAll: Limit;
  }
  tier: number;
}

function LimitsFromJson(json: any): LimitsFetch {
  return {
    deposit: {
      singleOperation: BigInt(json.deposit.singleOperation),
      dailyForAddress: {
        total:     BigInt(json.deposit.dailyForAddress.total),
        available: BigInt(json.deposit.dailyForAddress.available),
      },
      dailyForAll: {
        total:      BigInt(json.deposit.dailyForAll.total),
        available:  BigInt(json.deposit.dailyForAll.available),
      },
      poolLimit: {
        total:      BigInt(json.deposit.poolLimit.total),
        available:  BigInt(json.deposit.poolLimit.available),
      },
    },
    withdraw: {
      dailyForAll: {
        total:      BigInt(json.withdraw.dailyForAll.total),
        available:  BigInt(json.withdraw.dailyForAll.available),
      },
    },
    tier: json.tier === undefined ? 0 : Number(json.tier)
  };
}

export class ZkBobRelayer implements IZkBobService {
  // The simplest support for multiple relayer configuration
  // TODO: implement proper relayer swiching / fallbacking
  private relayerUrls: string[];
  private curIdx: number;
  private supportId: string | undefined;
  private relayerVersions = new Map<string, ServiceVersionFetch>(); // relayer version: URL -> version

  public static create(relayerUrls: string[], supportId: string | undefined): ZkBobRelayer {
    if (relayerUrls.length == 0) {
      throw new InternalError('ZkBobRelayer: you should provide almost one relayer url');
    }

    const object = new ZkBobRelayer();

    object.relayerUrls = relayerUrls;
    object.supportId = supportId;
    object.curIdx = 0;

    return object;
  }

  // ------------------=========< IZkBobService Methods >=========------------------
  // | Mandatory universal service routines                                        |
  // -------------------------------------------------------------------------------

  public type(): ServiceType {
    return ServiceType.Relayer;
  }

  public url(): string {
    return this.relayerUrls[this.curIdx];
  }

  public async version(): Promise<ServiceVersion> {
    const relayerUrl = this.url();

    let cachedVer = this.relayerVersions.get(relayerUrl);
    if (cachedVer === undefined || cachedVer.timestamp + RELAYER_VERSION_REQUEST_THRESHOLD * 1000 < Date.now()) {
      const url = new URL(`/version`, relayerUrl);
      const headers = defaultHeaders();

      const version = await fetchJson(url.toString(), {headers}, this.type());
      if (isServiceVersion(version) == false) {
        throw new ServiceError(this.type(), 200, `Incorrect response (expected ServiceVersion, got \'${version}\')`)
      }

      cachedVer = {version, timestamp: Date.now()};  
      this.relayerVersions.set(relayerUrl, cachedVer);
    }

    return cachedVer.version;
  }

  public async healthcheck(): Promise<boolean> {
    try {
      await this.info();
    } catch {
      return false;
    }

    return true;
  }

  // ----------------=========< Relayer Specific Routines >=========----------------
  // |                                                                             |
  // -------------------------------------------------------------------------------

  public async fetchTransactionsOptimistic(offset: BigInt, limit: number = 100): Promise<string[]> {
    const url = new URL(`/transactions/v2`, this.url());
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('offset', offset.toString());
    const headers = defaultHeaders(this.supportId);

    const txs = await fetchJson(url.toString(), {headers}, this.type());
    if (!Array.isArray(txs)) {
      throw new ServiceError(this.type(), 200, `Response should be an array`);
    }
  
    return txs;
  }
  
  // returns transaction job ID
  public async sendTransactions(txs: TxToRelayer[]): Promise<string> {
    const url = new URL('/sendTransactions', this.url());
    const headers = defaultHeaders(this.supportId);

    const res = await fetchJson(url.toString(), { method: 'POST', headers, body: JSON.stringify(txs) }, this.type());
    if (typeof res.jobId !== 'string') {
      throw new ServiceError(this.type(), 200, `Cannot get jobId for transaction (response: ${res})`);
    }

    return res.jobId;
  }
  
  public async getJob(id: string): Promise<JobInfo | null> {
    const url = new URL(`/job/${id}`, this.url());
    const headers = defaultHeaders(this.supportId);
    const res = await fetchJson(url.toString(), {headers}, this.type());
  
    if (isJobInfo(res)) {
      return res;
    }

    return null;
  }
  
  public async info(): Promise<RelayerInfo> {
    const url = new URL('/info', this.url());
    const headers = defaultHeaders();
    const res = await fetchJson(url.toString(), {headers}, this.type());

    if (isRelayerInfo(res)) {
      return res;
    }

    throw new ServiceError(this.type(), 200, `Incorrect response (expected RelayerInfo, got \'${res}\')`)
  }
  
  public async fee(): Promise<RelayerFee> {
    const headers = defaultHeaders(this.supportId);
    const url = new URL('/fee/v2', this.url());
    const fallbackUrl = new URL('/fee', this.url());

    let res;
    try {
      res = await fetchJson(url.toString(), {headers}, this.type());
    } catch (err) {
      res = await fetchJson(fallbackUrl.toString(), {headers}, this.type());
    }

    if (typeof res !== 'object' || res === null || 
        (!res.hasOwnProperty('fee') && !res.hasOwnProperty('baseFee')))
    {
      throw new ServiceError(this.type(), 200, 'Incorrect response for dynamic fees');
    }

    const feeResp = res.fee ?? res.baseFee;
    if (typeof feeResp === 'object' &&
        feeResp.hasOwnProperty('deposit') &&
        feeResp.hasOwnProperty('transfer') &&
        feeResp.hasOwnProperty('withdrawal') &&
        feeResp.hasOwnProperty('permittableDeposit')
    ){
      return {
        fee: {
          deposit: BigInt(feeResp.deposit),
          transfer: BigInt(feeResp.transfer),
          withdrawal: BigInt(feeResp.withdrawal),
          permittableDeposit: BigInt(feeResp.permittableDeposit),
        },
        oneByteFee: BigInt(res.oneByteFee ?? '0')
      };
    } else if (typeof feeResp === 'string') {
      return {
        fee: {
          deposit: BigInt(feeResp),
          transfer: BigInt(feeResp),
          withdrawal: BigInt(feeResp),
          permittableDeposit: BigInt(feeResp),
        },
        oneByteFee: BigInt(res.oneByteFee ?? '0')
      };
    } else {
      throw new ServiceError(this.type(), 200, 'Incorrect fee field');
    }
  }
  
  public async limits(address: string | undefined): Promise<LimitsFetch> {
    const url = new URL('/limits', this.url());
    if (address !== undefined) {
      url.searchParams.set('address', address);
    }
    const headers = defaultHeaders(this.supportId);
    const res = await fetchJson(url.toString(), {headers}, this.type());

    return LimitsFromJson(res);
  }

  public async siblings(index: number): Promise<TreeNode[]> {
    const url = new URL(`/siblings`, this.url());
    url.searchParams.set('index', index.toString());
    const headers = defaultHeaders(this.supportId);

    const siblings = await fetchJson(url.toString(), {headers}, this.type());
    if (!Array.isArray(siblings)) {
      throw new ServiceError(this.type(), 200, `Response should be an array`);
    }
  
    return siblings.map((aNode) => {
      let node = hexToNode(aNode)
      if (!node) {
        throw new ServiceError(this.type(), 200, `Cannot convert \'${aNode}\' to a TreeNode`);
      }
      return node;
    });
  }

  public async txParamsHash(): Promise<string> {
    const url = new URL('/params/hash/tx', this.url());
    const headers = defaultHeaders();
    const res = await fetchJson(url.toString(), {headers}, this.type());

    if (typeof res !== 'object' || res === null ||
        !res.hasOwnProperty('hash') || typeof res.hash !== 'string')
    {
      throw new ServiceError(this.type(), 200, 'Incorrect response for tx params hash');
    }
  
    return res.hash;
  }

  // Amount of the pool tokens which could be swapped to the native ones
  // in a single withdrawal transaction (aka native_amount)
  public async maxSupportedSwapAmount(): Promise<bigint> {
    const url = new URL('/maxNativeAmount', this.url());
    const headers = defaultHeaders(this.supportId);
    const res = await fetchJson(url.toString(), {headers}, this.type());

    if (typeof res !== 'object' || res === null ||
        !res.hasOwnProperty('maxNativeAmount') || typeof res.maxNativeAmount !== 'string')
    {
      throw new ServiceError(this.type(), 200, 'Incorrect respons for /maxNativeAmount');
    }
  
    return BigInt(res.maxNativeAmount);
  }
}