import { InternalError } from "./errors";
import { FileCache } from "./file-cache";

const MAX_VK_LOAD_ATTEMPTS = 3;

export enum LoadingStatus {
    NotStarted = 0,
    InProgress,
    Completed,
    Failed
}

// The class controls both the SNARK params and associated verification key
// You can initiate param/vk loading independently when needed
export class SnarkParams {
    private paramUrl: string;
    private vkUrl: string;
    private expectedHash: string | undefined;   // only params verified by a hash

    private cache: FileCache;

    // params - wasm object (from binary), vk - json
    private params: any | undefined;
    private vk: any | undefined;
    
    // covers only params not vk
    private loadingPromise: Promise<any> | undefined;
    private loadingStatus: LoadingStatus;

    public constructor(paramUrl: string, vkUrl: string, expectedParamHash: string | undefined) {
        this.loadingStatus = LoadingStatus.NotStarted;
        this.paramUrl = paramUrl;
        this.vkUrl = vkUrl;
        this.expectedHash = expectedParamHash;
    }

    public async getParams(wasm: any): Promise<any> {
        if (!this.isParamsReady()) {
            this.loadParams(wasm);
            return await this.loadingPromise;
        }

        return this.params;
    }

    // VKs are much smaller than params so we can refetch it in case any errors
    public async getVk(): Promise<any> {
        let attempts = 0;
        while (!this.isVkReady() && attempts++ < MAX_VK_LOAD_ATTEMPTS) {
          console.time(`VK initializing`);
          try {
            const cache = await this.fileCache();
            let vkData = await cache.getOrCache(this.vkUrl);
            const vk = JSON.parse(Buffer.from(vkData).toString('utf8'));
            // verify VK structure
            if (typeof vk === 'object' && vk !== null &&
                vk.hasOwnProperty('alpha') && typeof Array.isArray(vk.alpha) &&
                vk.hasOwnProperty('beta') && typeof Array.isArray(vk.beta) &&
                vk.hasOwnProperty('gamma') && typeof Array.isArray(vk.gamma) &&
                vk.hasOwnProperty('delta') && typeof Array.isArray(vk.delta) &&
                vk.hasOwnProperty('ic') && typeof Array.isArray(vk.uc))
            {
                this.vk = vk;
            } else {
                throw new InternalError(`The object isn't a valid VK`);
            }

            this.vk = vk;
          } catch(err) {
            console.warn(`Cannot load verification key: ${err.message}`);
          } finally {
            console.timeEnd(`VK initializing`);
          }
        }

        if (!this.isVkReady()) {
            throw new InternalError(`Cannot load a valid VK after ${MAX_VK_LOAD_ATTEMPTS} attempts`);
        }

        return this.vk;
      }

    private loadParams(wasm: any) {
        if (this.isParamsReady() || this.loadingStatus == LoadingStatus.InProgress) {
            return;
        }

        this.loadingStatus = LoadingStatus.InProgress;
        this.loadingPromise = new Promise(async (resolve, reject) => {
            try {
                const cache = await this.fileCache();

                console.time(`Load parameters from DB`);
                let txParamsData = await cache.get(this.paramUrl)
                    .finally(() => console.timeEnd(`Load parameters from DB`));

                // check parameters hash if needed
                if (txParamsData && this.expectedHash !== undefined) {
                    let computedHash = await cache.getHash(this.paramUrl);
                    if (!computedHash) {
                        computedHash = await cache.saveHash(this.paramUrl, txParamsData);
                    }

                    if (computedHash.toLowerCase() != this.expectedHash.toLowerCase()) {
                        // forget saved params in case of hash inconsistence
                        console.warn(`Hash of cached tx params (${computedHash}) doesn't associated with provided (${this.paramUrl}).`);
                        cache.remove(this.paramUrl);
                        txParamsData = null;
                    }
                }

                let params;
                if (!txParamsData) {
                    console.time(`Download params`);
                    txParamsData = await cache.cache(this.paramUrl)
                        .finally(() => console.timeEnd(`Download params`));

                    try {
                        console.time(`Creating Params object`);
                        params = wasm.Params.fromBinary(new Uint8Array(txParamsData!));
                    } finally {
                        console.timeEnd(`Creating Params object`);
                    }
                } else {
                    console.log(`File ${this.paramUrl} is present in cache, no need to fetch`);

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

    private isParamsReady(): boolean {
        return this.params !== undefined;
    }

    private isVkReady(): boolean {
        return this.vk !== undefined;
    }

    private async fileCache(): Promise<FileCache> {
        if (!this.cache) {
            this.cache = await FileCache.init();
        }

        return this.cache;
    }
}

