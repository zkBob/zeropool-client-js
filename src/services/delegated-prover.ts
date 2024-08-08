import { SecretData } from "kalypso-sdk/dist/types";
import { InternalError, ServiceError } from "../errors";
import {
  IZkBobService,
  ServiceType,
  ServiceVersion,
  isServiceVersion,
  ServiceVersionFetch,
  defaultHeaders,
  fetchJson,
} from "./common";
import { KalypsoSdk } from "kalypso-sdk";
import { ethers } from "ethers";

const PROVER_VERSION_REQUEST_THRESHOLD = 3600; // prover's version expiration (in seconds)

export class ZkBobDelegatedProver implements IZkBobService {
  private proverUrls: string[];
  // TODO: implement proper prover swiching / fallbacking
  private curIdx: number;
  private supportId: string | undefined;
  private proverVersions = new Map<string, ServiceVersionFetch>(); // prover version: URL -> version
  private config: any;
  private kalypso: KalypsoSdk;
  public static create(
    proverUrls: string[],
    supportId: string | undefined,
  ): ZkBobDelegatedProver {
    if (proverUrls.length == 0) {
      throw new InternalError(
        "ZkBobDelegatedProver: you should provide almost one delegated prover url",
      );
    }

    const object = new ZkBobDelegatedProver();

    object.proverUrls = proverUrls;
    object.supportId = supportId;
    object.curIdx = 0;

    return object;
  }

  // ------------------=========< IZkBobService Methods >=========------------------
  // | Mandatory universal service routines                                        |
  // -------------------------------------------------------------------------------

  public type(): ServiceType {
    return ServiceType.DelegatedProver;
  }

  public async version(): Promise<ServiceVersion> {
    const proverUrl = this.url();

    let cachedVer = this.proverVersions.get(proverUrl);
    if (
      cachedVer === undefined ||
      cachedVer.timestamp + PROVER_VERSION_REQUEST_THRESHOLD * 1000 < Date.now()
    ) {
      const url = new URL(`/version`, proverUrl);
      const headers = defaultHeaders();

      const version = await fetchJson(url.toString(), { headers }, this.type());
      if (isServiceVersion(version) == false) {
        throw new ServiceError(
          this.type(),
          200,
          `Incorrect response (expected ServiceVersion, got \'${version}\')`,
        );
      }

      cachedVer = { version, timestamp: Date.now() };
      this.proverVersions.set(proverUrl, cachedVer);
    }

    return cachedVer.version;
  }

  public url(): string {
    return this.proverUrls[this.curIdx];
  }

  public async healthcheck(): Promise<boolean> {
    try {
      const url = new URL(`/config`, this.url());
      const headers = defaultHeaders();

      const proverConfig: any = await fetchJson(
        url.toString(),
        { headers },
        this.type(),
      );

      const provider = new ethers.JsonRpcProvider(proverConfig.rpc);
      //we don't really need a wallet here, since we're doing only read calls but it's currently required by kalypso
      this.config = proverConfig;
      this.kalypso = new KalypsoSdk(
        new ethers.Wallet(
          //test test test test test test test test test test test junk
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
          provider,
        ) as any,
        proverConfig,
      );

      return isServiceVersion(proverConfig);
    } catch {
      return false;
    }
  }

  // ------------=========< Delegated Prover Specific Routines >=========------------
  // |                                                                              |
  // --------------------------------------------------------------------------------

  public async proveTx(pub: any, sec: any, memo: any): Promise<any> {
    console.log("delegated prover proveTx");

    console.log("using config", this.config);

    let abiCoder = new ethers.AbiCoder();

    let inputBytes = abiCoder.encode(
      ["uint256[5]"],
      [[pub.root, pub.nullifier, pub.out_commit, pub.delta, pub.memo]],
    );

    const encryptedRequestData = await this.kalypso
      .MarketPlace()
      .createEncryptedRequestData(
        inputBytes,
        Buffer.from(JSON.stringify(sec)),
        BigInt(this.config.marketId),
        this.config.pubKey,
      );
    console.log(encryptedRequestData);
    const body = JSON.stringify({
      ...encryptedRequestData,
      // memo,
    });

    const url = new URL(this.config.path, this.url());

    const proof = await fetchJson(
      url.toString(),
      {
        method: "POST",
        body,
        headers: [["Content-type", "application/json"]],
      },
      ServiceType.DelegatedProver,
    );

    return proof;
  }
}
