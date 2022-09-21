import { openDB, IDBPDatabase } from 'idb';

export type LoadingProgressCallback = (loadedBytes: number, totalBytes: number) => void;

const STORE_NAME = 'files';

export class FileCache {
  private db: IDBPDatabase;

  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  static async init(): Promise<FileCache> {
    const db = await openDB('zp.file_cache', 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
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
          console.log(`Received ${loadedBytes} of ${totalBytes} (${(loadedBytes / totalBytes) * 100.0} %)`)
        }
      }

      console.log(`Concatenating chunks...`);

      // Concatenate data chunks into single Uint8Array
      let chunksAll = new Uint8Array(loadedBytes);
      let position = 0;
      for(let chunk of chunks) {
        chunksAll.set(chunk, position); // (4.2)
        position += chunk.length;
      }

      console.log(`Saving buffer to the database`);

      const data = chunksAll.buffer;
      await this.db.put(STORE_NAME, data, path);

      console.log(`Parameter file loaded`);

      return data;

    } else {
      throw Error(`Cannot get response body for ${path}`);
    }

    const data = await (await fetch(path)).arrayBuffer();
    await this.db.put(STORE_NAME, data, path);
    return data;
  }

  public async get(path: string): Promise<ArrayBuffer | null> {
    let data = await this.db.get(STORE_NAME, path);
    return data;
  }
}
