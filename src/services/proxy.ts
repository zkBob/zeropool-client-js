import { InternalError } from "../errors";
import { ServiceType } from "./common";
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
        // TODO: Implement me!
        return '0xfec49782fe8e11de9fb3ba645a76fe914fffe3cb';
    }

    protected async proverFee(): Promise<bigint> {
        // TODO: Implement me!
        return 100000000n;
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