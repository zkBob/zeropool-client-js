import { InternalError, ServiceError } from "../errors";
import { ServiceType, defaultHeaders, fetchJson } from "./common";
import { RelayerFee, ZkBobRelayer } from "./relayer";


export interface ProxyFee extends RelayerFee {
    proxyAddress: string;
    proverFee: bigint
}

export class ZkBobProxy extends ZkBobRelayer {
    private constructor(proxyUrls: string[], supportId: string | undefined) {
        super();
        
        if (proxyUrls.length === 0) {
            throw new InternalError('ZkBobProxy: you should provide at least one proxy url');
        }

        this.relayerUrls = proxyUrls;
        this.supportId = supportId;
        this.curIdx = 0;
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

    protected async proxyAddress(): Promise<string> {
        const headers = defaultHeaders(this.supportId);
        const url = new URL('/address', this.url());

        const addrResp = await fetchJson(url.toString(), {headers}, this.type());


        if (!addrResp || typeof addrResp !== 'object' || !addrResp.hasOwnProperty('address')) {
            throw new ServiceError(this.type(), 200, 'Incorrect response for proxy address');
        }

        return addrResp.address;
    }

    protected async proverFee(): Promise<bigint> {
        const headers = defaultHeaders(this.supportId);
        const url = new URL('/proverFee', this.url());

        const proverFee = await fetchJson(url.toString(), {headers}, this.type());


        if (!proverFee || typeof proverFee !== 'object' || !proverFee.hasOwnProperty('fee')) {
            throw new ServiceError(this.type(), 200, 'Incorrect response for prover fee');
        }

        return BigInt(proverFee.fee);
    }

    public override async fee(): Promise<ProxyFee> {
        const [fee, proxyAddress, proverFee] = await Promise.all([
            super.fee(),
            this.proxyAddress(),
            this.proverFee()
        ]);

        return {
            ...fee,
            proxyAddress,
            proverFee,
        }
    }
}