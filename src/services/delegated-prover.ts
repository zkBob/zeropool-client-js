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

const PROVER_VERSION_REQUEST_THRESHOLD = 3600; // prover's version expiration (in seconds)

export class ZkBobDelegatedProver implements IZkBobService {
  private proverUrls: string[];
  // TODO: implement proper prover swiching / fallbacking
  private curIdx: number;
  private supportId: string | undefined;
  private proverVersions = new Map<string, ServiceVersionFetch>(); // prover version: URL -> version
  private proverPubKey: string;

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
    object.proverPubKey =
      "04e84450db2948a8efd92fa52342fff3c3286189ca62efde1f8d96ba733247a3080d944e29f2f206d44533afc5523422f492f92fa9140e7bac48740dbb46300e45";

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
      const url = new URL(`/version`, this.url());
      const headers = defaultHeaders();

      const version = await fetchJson(url.toString(), { headers }, this.type());
      return isServiceVersion(version);
    } catch {
      return false;
    }
  }

  // ------------=========< Delegated Prover Specific Routines >=========------------
  // |                                                                              |
  // --------------------------------------------------------------------------------

  public async proveTx(pub: any, sec: any): Promise<any> {
    const secretInputs = JSON.stringify(
      await KalypsoSdk.SecretInputOperations().encryptDataWithECIESandAES(
        sec,
        this.proverPubKey,
      ),
    );
    const body = JSON.stringify({
      ...pub,
      secretInputs,
    });
    const url = new URL("/prove");

    const proof = await fetchJson(
      url.toString(),
      {
        method: "POST",
        body,
      },
      ServiceType.DelegatedProver,
    );

    return proof;
  }
}
