import { openDB, IDBPDatabase } from 'idb';
import sha256 from 'fast-sha256';

export type LoadingProgressCallback = (loadedBytes: number, totalBytes: number) => void;

const STORE_FILES = 'files';
const STORE_HASHES = 'hashes';

export class FileCache {
  private db: IDBPDatabase;

  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  static async init(): Promise<FileCache> {
    const db = await openDB('zp.file_cache', 2, {
      upgrade(db) {
        db.createObjectStore(STORE_FILES);
        db.createObjectStore(STORE_HASHES);
      }
    });

    const cache = new FileCache(db);
    return cache;
  }

  public async getOrCache(path: string, loadingCallback: LoadingProgressCallback | undefined = undefined): Promise<ArrayBuffer> {
    let data = await this.get(path);
    if (!data) {
      console.log(`Caching ${path}`)
      data = await this.cache(path);
    } else {
      console.log(`File ${path} is present in cache, no need to fetch`);
    }

    return data;
  }

  public async cache(path: string, loadingCallback: LoadingProgressCallback | undefined = undefined): Promise<ArrayBuffer> {
    let response = await fetch(path);

    if (response.body) {
      const reader = response.body.getReader();  
      
      // Total file length
      const totalBytes = Number(response.headers.get('Content-Length'));

      // Reading the data chunks
      let loadedBytes = 0; // received that many bytes at the moment
      let chunks: Array<Uint8Array> = []; // array of received binary chunks (comprises the body)
      while(true) {
        const res = await reader.read();
        if (res.done) {
          break;
        }

        if (res.value !== undefined) {
          chunks.push(res.value);
          loadedBytes += res.value.length;

          if (loadingCallback !== undefined) {
            loadingCallback(loadedBytes, totalBytes)
          }
        }
      }

      // Concatenate data chunks into single Uint8Array
      let chunksAll = new Uint8Array(loadedBytes);
      let position = 0;
      for(let chunk of chunks) {
        chunksAll.set(chunk, position); // (4.2)
        position += chunk.length;
      }
      const data = chunksAll.buffer;

      console.time(`Saving ${path} to the database`);
      await this.db.put(STORE_FILES, data, path);
      console.timeEnd(`Saving ${path} to the database`);

      // Calculate and write params hash without waiting
      this.saveHash(path, data);

      return data;
    } else {
      throw Error(`Cannot get response body for ${path}`);
    }
  }

  public async get(path: string): Promise<ArrayBuffer | null> {
    let data = await this.db.get(STORE_FILES, path);
    return data;
  }

  public async getHash(path: string): Promise<string | null> {
    let data = await this.db.get(STORE_HASHES, path);
    return data;
  }

  public async calcHash(data: ArrayBuffer): Promise<string> {
    console.time(`Compute hash for ${data.byteLength} bytes`);
    const sha = sha256(new Uint8Array(data));
    const computedHash = [...new Uint8Array(sha)].map(x => x.toString(16).padStart(2, '0')).join('');
    console.timeEnd(`Compute hash for ${data.byteLength} bytes`);

    return computedHash;
  }

  public async saveHash(path: string, data: ArrayBuffer): Promise<string> {
    const computedHash = await this.calcHash(data);
    await this.db.put(STORE_HASHES, computedHash, path);

    return computedHash;
  }

  public async remove(path: string): Promise<void> {
    await this.db.delete(STORE_FILES, path);
    await this.db.delete(STORE_HASHES, path);
  }
}
