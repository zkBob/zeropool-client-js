import { InternalError } from "./errors";
import { FileCache } from "./file-cache";

export enum LoadingStatus {
    NotStarted = 0,
    InProgress,
    Completed,
    Failed
}

export class SnarkParams {
    url: string;
    expectedHash: string | undefined;
    params: any | undefined;
    loadingPromise: Promise<any>;
    loadingStatus: LoadingStatus;

    public constructor(url: string, expectedHash: string | undefined) {
        this.loadingStatus = LoadingStatus.NotStarted;
        this.url = url;
        this.expectedHash = expectedHash;
    }

    public async get(wasm: any): Promise<any> {
        if (this.loadingStatus == LoadingStatus.Completed) {
            return this.params;
        }

        if (this.loadingStatus == LoadingStatus.NotStarted || this.loadingStatus == LoadingStatus.Failed) {
            this.load(wasm);
        }

        return await this.loadingPromise;
    }

    public load(wasm: any) {
        this.loadingStatus = LoadingStatus.InProgress;
        this.loadingPromise = new Promise(async (resolve, reject) => {
            try {
                const cache = await FileCache.init();

                console.time(`Load parameters from DB`);
                let txParamsData = await cache.get(this.url)
                    .finally(() => console.timeEnd(`Load parameters from DB`));

                // check parameters hash if needed
                if (txParamsData && this.expectedHash !== undefined) {
                    let computedHash = await cache.getHash(this.url);
                    if (!computedHash) {
                        computedHash = await cache.saveHash(this.url, txParamsData);
                    }

                    if (computedHash.toLowerCase() != this.expectedHash.toLowerCase()) {
                        // forget saved params in case of hash inconsistence
                        console.warn(`Hash of cached tx params (${computedHash}) doesn't associated with provided (${this.url}).`);
                        cache.remove(this.url);
                        txParamsData = null;
                    }
                }

                let params;
                if (!txParamsData) {
                    console.time(`Download params`);
                    txParamsData = await cache.cache(this.url)
                        .finally(() => console.timeEnd(`Download params`));

                    try {
                        console.time(`Creating Params object`);
                        params = wasm.Params.fromBinary(new Uint8Array(txParamsData!));
                    } finally {
                        console.timeEnd(`Creating Params object`);
                    }
                } else {
                    console.log(`File ${this.url} is present in cache, no need to fetch`);

                    try {
                        console.time(`Creating Params object`);
                        params = wasm.Params.fromBinaryExtended(new Uint8Array(txParamsData!), false, false);
                    } finally {
                        console.timeEnd(`Creating Params object`);
                    }
                }
                resolve(params);
            } catch (err) {
                reject(new InternalError(`Failed to load params: ${err.message}`));
            }
        }).then((params) => {
            this.params = params;
            this.loadingStatus = LoadingStatus.Completed;
            return params;
        }, (err) => {
            this.params = undefined;
            this.loadingStatus = LoadingStatus.Failed;
            throw err;
        })
    }
}

