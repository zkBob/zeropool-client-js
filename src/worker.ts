import { expose } from 'comlink';
import { IndexedTx, ParseTxsResult, ParseTxsColdStorageResult, StateUpdate, SnarkProof, TreeNode,
          ITransferData, IDepositData, IWithdrawData, IDepositPermittableData
        } from 'libzkbob-rs-wasm-web';
import { FileCache } from './file-cache';
import { threads } from 'wasm-feature-detect';

let transferParamsUrl: string;
let transferParamsHash: string | undefined;
let transferParams: Promise<any>;

let treeParams: any;
let txParser: any;
let zpAccounts: { [tokenAddress: string]: any } = {};
let transferVk: any;
let treeVk: any;

let wasm: any;

const obj = {
  async initWasm(
    paramUrls: { txParams: string; treeParams: string },
    txParamsHash: string | undefined = undefined,  // skip hash checking when undefined
    vkUrls: {transferVkUrl: string, treeVkUrl: string},
  ) {
    console.info('Initializing web worker...');
    
    // Safari doesn't support spawning Workers from inside other Workers yet.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMt = await threads() && !isSafari;
    
    if (isMt) {
      console.log('Using multi-threaded version');
      wasm = await import('libzkbob-rs-wasm-web-mt');
      await wasm.default();
      await wasm.initThreadPool(navigator.hardwareConcurrency);
    } else {
      console.log('Using single-threaded version. Proof generation will be significantly slower.');
      wasm = await import('libzkbob-rs-wasm-web');
      await wasm.default()
    }

    transferParamsUrl = paramUrls.txParams;
    transferParamsHash = txParamsHash;
    transferParams = this.getTxParams();

    txParser = wasm.TxParser._new()

    console.time(`VK initializing`);
    transferVk = await (await fetch(vkUrls.transferVkUrl)).json();
    treeVk = await (await fetch(vkUrls.treeVkUrl)).json();
    console.timeEnd(`VK initializing`);

    console.info('Web worker init complete.');
  },

  async getTxParams(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const cache = await FileCache.init();

        console.time(`Load parameters from DB`);
        let txParamsData = await cache.get(transferParamsUrl);
        console.timeEnd(`Load parameters from DB`);

        // check parameters hash if needed
        if (txParamsData && transferParamsHash !== undefined) {
          let computedHash = await cache.getHash(transferParamsUrl);
          if (!computedHash) {
            computedHash = await cache.saveHash(transferParamsUrl, txParamsData);
          }
          
          if (computedHash.toLowerCase() != transferParamsHash.toLowerCase()) {
            // forget saved params in case of hash inconsistence
            console.warn(`Hash of cached tx params (${computedHash}) doesn't associated with provided (${transferParamsHash}).`);
            cache.remove(transferParamsUrl);
            txParamsData = null;
          }
        }

        let txParams;
        if (!txParamsData) {
          console.time(`Download params`);
          txParamsData = await cache.cache(transferParamsUrl);
          console.timeEnd(`Download params`);

          console.time(`Creating Params object`);
          txParams = wasm.Params.fromBinary(new Uint8Array(txParamsData!));
          console.timeEnd(`Creating Params object`);

        } else {
          console.log(`File ${transferParamsUrl} is present in cache, no need to fetch`);
          console.time(`Creating Params object`);
          txParams = wasm.Params.fromBinaryExtended(new Uint8Array(txParamsData!), false, false);
          console.timeEnd(`Creating Params object`);
        }
        resolve(txParams);
      } catch (err) {
        console.warn(`Failed to load params: ${err.message}`);
        reject(new Error(`Failed to load params: ${err.message}`));
      }
    });
  },

  async proveTx(pub, sec) {
    console.debug('Web worker: proveTx');
    let params = await transferParams.catch((_) => {
      console.info("Trying to load params again...");
      transferParams = this.getTxParams();
      return transferParams;
    });
    return wasm.Proof.tx(params, pub, sec);
  },

  async proveTree(pub, sec) {
    console.debug('Web worker: proveTree');
    return wasm.Proof.tree(treeParams, pub, sec);
  },

  async parseTxs(sk: Uint8Array, txs: IndexedTx[]): Promise<ParseTxsResult> {
    console.debug('Web worker: parseTxs');
    const result = txParser.parseTxs(sk, txs)
    sk.fill(0)
    return result;
  },

  async createAccount(address: string, sk: Uint8Array, networkName: string, userId: string): Promise<void> {
    console.debug('Web worker: createAccount');
    try {
      const state = await wasm.UserState.init(`zp.${networkName}.${userId}`);
      const acc = new wasm.UserAccount(sk, state);
      zpAccounts[address] = acc;
    } catch (e) {
      console.error(e);
    }
  },

  async totalBalance(address: string): Promise<string> {
    return zpAccounts[address].totalBalance();
  },

  async accountBalance(address: string): Promise<string> {
    return zpAccounts[address].accountBalance();
  },

  async noteBalance(address: string): Promise<string> {
    return zpAccounts[address].noteBalance();
  },

  async usableNotes(address: string): Promise<any[]> {
    return zpAccounts[address].getUsableNotes();
  },

  async isOwnAddress(address: string, shieldedAddress: string): Promise<boolean> {
    return zpAccounts[address].isOwnAddress(shieldedAddress);
  },

  async rawState(address: string): Promise<any> {
    return zpAccounts[address].getWholeState();
  },

  async free(address: string): Promise<void> {
    return zpAccounts[address].free();
  },

  async generateAddress(address: string): Promise<string> {
    return zpAccounts[address].generateAddress();
  },

  async createDepositPermittable(address: string, deposit: IDepositPermittableData): Promise<any> {
    return zpAccounts[address].createDepositPermittable(deposit);
  },

  async createTransferOptimistic(address: string, tx: ITransferData, optimisticState: any): Promise<any> {
    return zpAccounts[address].createTransferOptimistic(tx, optimisticState);
  },

  async createWithdrawalOptimistic(address: string, tx: IWithdrawData, optimisticState: any): Promise<any> {
    return zpAccounts[address].createWithdrawalOptimistic(tx, optimisticState);
  },

  async createDeposit(address: string, deposit: IDepositData): Promise<any> {
    return zpAccounts[address].createDeposit(deposit);
  },

  async createTransfer(address: string, transfer: ITransferData): Promise<any> {
    return zpAccounts[address].createTransfer(transfer);
  },

  async nextTreeIndex(address: string): Promise<bigint> {
    return zpAccounts[address].nextTreeIndex();
  },

  async firstTreeIndex(address: string): Promise<bigint | undefined> {
    return zpAccounts[address].firstTreeIndex();
  },

  async getRoot(address: string): Promise<string> {
    return zpAccounts[address].getRoot();
  },

  async getRootAt(address: string, index: bigint): Promise<string> {
    return zpAccounts[address].getRootAt(index);
  },

  async getLeftSiblings(address: string, index: bigint): Promise<TreeNode[]> {
    return zpAccounts[address].getLeftSiblings(index);
  },

  async rollbackState(address: string, index: bigint): Promise<bigint> {
    return zpAccounts[address].rollbackState(index);
  },

  async wipeState(address: string): Promise<void> {
    return zpAccounts[address].wipeState();
  },

  async getTreeLastStableIndex(address: string): Promise<bigint> {
    return zpAccounts[address].treeGetStableIndex();
  },

  async setTreeLastStableIndex(address: string, index: bigint): Promise<void> {
    return zpAccounts[address].treeSetStableIndex(index);
  },

  async updateState(address: string, stateUpdate: StateUpdate, siblings?: TreeNode[]): Promise<void> {
    return zpAccounts[address].updateState(stateUpdate, siblings);
  },

  async updateStateColdStorage(address: string, bulks: Uint8Array[], indexFrom?: bigint, indexTo?: bigint): Promise<ParseTxsColdStorageResult> {
    return zpAccounts[address].updateStateColdStorage(bulks, indexFrom, indexTo);
  },

  async verifyTxProof(inputs: string[], proof: SnarkProof): Promise<boolean> {
    return wasm.Proof.verify(transferVk!, inputs, proof);
  },

  async verifyTreeProof(inputs: string[], proof: SnarkProof): Promise<boolean> {
    return wasm.Proof.verify(treeVk!, inputs, proof);
  },

  async verifyShieldedAddress(shieldedAddress: string): Promise<boolean> {
    return wasm.validateAddress(shieldedAddress);
  },

  async assembleAddress(d: string, p_d: string): Promise<string> {
    return wasm.assembleAddress(d, p_d);
  }
};

expose(obj);
