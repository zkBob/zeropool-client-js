import { InternalError, ServiceError } from "../errors";
import { ServiceType, defaultHeaders, fetchJson } from "./common";
import { RelayerFee, ZkBobRelayer, evaluateRelayerFeeValue } from "./relayer";

const PROXY_BEST_FEE_REQUEST_THRESHOLD = 120; // before requesting new optimal relayer (in seconds)

export interface ProxyFee extends RelayerFee {
    proxyAddress: string;
    proverFee: bigint
}
  
export function compareProxyFee(fee1: ProxyFee, fee2: ProxyFee): boolean {
    const r1 = evaluateRelayerFeeValue(fee1) + fee1.proverFee;
    const r2 = evaluateRelayerFeeValue(fee2) + fee2.proverFee;

    return r1 < r2;
}

export class ZkBobProxy extends ZkBobRelayer {
    protected findOptimalProxyTs: number;

    private constructor(proxyUrls: string[], supportId: string | undefined) {
        super();
        
        if (proxyUrls.length === 0) {
            throw new InternalError('ZkBobProxy: you should provide at least one proxy url');
        }

        this.relayerUrls = proxyUrls;
        this.supportId = supportId;
        this.curIdx = 0;

        this.findOptimalProxyTs = 0;
    }

    public static create(proxyUrls: string[], supportId: string | undefined): ZkBobProxy {
        return new ZkBobProxy(proxyUrls, supportId);
    }

    // ------------------=========< IZkBobService Methods >=========------------------
    // | Reusing most of methods from ZkBobRelayer                                   |
    // -------------------------------------------------------------------------------

    public override type(): ServiceType {
        return ServiceType.Proxy;
    }

    // ----------------=========< Proxy Specific Routines >=========----------------
    // | Reusing ZkBobRelayer methods                                              |
    // -----------------------------------------------------------------------------

    protected async proxyAddress(idx?: number): Promise<string> {
        const headers = defaultHeaders(this.supportId);
        const url = new URL('/address', this.url(idx));

        const addrResp = await fetchJson(url.toString(), {headers}, this.type());


        if (!addrResp || typeof addrResp !== 'object' || !addrResp.hasOwnProperty('address')) {
            throw new ServiceError(this.type(), 200, 'Incorrect response for proxy address');
        }

        return addrResp.address;
    }

    protected async proverFee(idx?: number): Promise<bigint> {
        const headers = defaultHeaders(this.supportId);
        const url = new URL('/proverFee', this.url(idx));

        const proverFee = await fetchJson(url.toString(), {headers}, this.type());


        if (!proverFee || typeof proverFee !== 'object' || !proverFee.hasOwnProperty('fee')) {
            throw new ServiceError(this.type(), 200, 'Incorrect response for prover fee');
        }

        return BigInt(proverFee.fee);
    }

    public override async fee(): Promise<ProxyFee> {
        if ((Date.now() - this.findOptimalProxyTs) > PROXY_BEST_FEE_REQUEST_THRESHOLD) {
            return this.findOptimalFee();
        }

        return this.feeInternal();
    }

    protected async feeInternal(idx?: number): Promise<ProxyFee> {
        const [fee, proxyAddress, proverFee] = await Promise.all([
            super.fee(idx),
            this.proxyAddress(idx),
            this.proverFee(idx)
        ]);

        return {
            ...fee,
            proxyAddress,
            proverFee,
        }
    }
    
    // find sequencer with the best fee and switch
    protected async findOptimalFee(): Promise<ProxyFee> {
        console.log('ZkBobProxy: finding best sequencer from the list')

        const feePromises = await this.relayerUrls.map(async (_, index) => {
            const available = await this.healthcheck(index);
            if (available) {
                try {
                    const fee = await this.feeInternal(index);
                    return { index, fee };
                } catch {
                    console.log(`[ZkBobProxy] cannot retrieve fee from sequencer ${index} (${this,this.url(index)})`);
                }
            }
            return null;
        });
        const fees = (await Promise.all(feePromises)).filter(r => r !== null)  as { index: number, fee: ProxyFee }[];;

        if (fees.length > 0) {
            const minFeeSeq = fees.reduce((minFeeProxy, proxy) =>
                compareProxyFee(proxy.fee, minFeeProxy.fee) ? proxy : minFeeProxy
            );

            if (this.curIdx != minFeeSeq.index) {
                console.log(`ZkBobProxy: switching seqencer to ${minFeeSeq.index} (${this.url(minFeeSeq.index)}) due to best fee`);
                this.curIdx = minFeeSeq.index
                this.findOptimalProxyTs = Date.now();
            }

            return minFeeSeq.fee;
        }

        throw new InternalError('ZkBobProxy: cannot find live sequencer')
    }
}