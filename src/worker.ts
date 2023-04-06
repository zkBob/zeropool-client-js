import { expose } from 'comlink';
import { IDepositData, IDepositPermittableData, ITransferData, IWithdrawData,
          ParseTxsResult, ParseTxsColdStorageResult, StateUpdate,
          IndexedTx, TreeNode, SnarkProof,
        } from 'libzkbob-rs-wasm-web';
import { threads } from 'wasm-feature-detect';
import { SnarkParams } from './params';

let txParams: SnarkParams;
let txParser: any;
let zpAccounts: { [accountId: string]: any } = {};

let wasm: any;

const obj = {
  async initWasm(
    txParamsUrl: string,
    txParamsHash: string | undefined = undefined,  // skip hash checking when undefined
    txVkUrl: string,
    forcedMultithreading: boolean | undefined = undefined,
  ) {
    console.info('Initializing web worker...');
    
    // Safari doesn't support spawning Workers from inside other Workers yet.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMtSupported = await threads() && !isSafari;
    const isMt = forcedMultithreading ?? isMtSupported;  // forced MT param has a higher priority than supported one
    
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

    txParams = new SnarkParams(txParamsUrl, txVkUrl, txParamsHash);
    // VK is always needed to transact, so initiate its loading right now
    txParams.getVk().catch((err) => {
      console.warn(`Unable to fetch tx verification key (don't worry, it will refetched when needed): ${err.message}`);
    });

    txParser = wasm.TxParser._new()

    console.info('Web worker init complete.');
  },

  async loadTxParams() {
    txParams.getParams(wasm);
  },

  async proveTx(pub, sec) {
    console.debug('Web worker: proveTx');
    let params = await txParams.getParams(wasm);
    return wasm.Proof.tx(params, pub, sec);
  },

  async parseTxs(sk: Uint8Array, txs: IndexedTx[]): Promise<ParseTxsResult> {
    console.debug('Web worker: parseTxs');
    const result = txParser.parseTxs(sk, txs)
    sk.fill(0)
    return result;
  },

  // accountId is a unique string depends on network, poolId and sk
  // The local db will be named with accountId
  async createAccount(accountId: string, sk: Uint8Array, poolId: number): Promise<void> {
    console.debug('Web worker: createAccount');
    try {
      const state = await wasm.UserState.init(accountId);
      const acc = new wasm.UserAccount(sk, BigInt(poolId), state);
      zpAccounts[accountId] = acc;
    } catch (e) {
      console.error(e);
    }
  },

  async totalBalance(accountId: string): Promise<string> {
    return zpAccounts[accountId].totalBalance();
  },

  async accountBalance(accountId: string): Promise<string> {
    return zpAccounts[accountId].accountBalance();
  },

  async noteBalance(accountId: string): Promise<string> {
    return zpAccounts[accountId].noteBalance();
  },

  async usableNotes(accountId: string): Promise<any[]> {
    return zpAccounts[accountId].getUsableNotes();
  },

  async isOwnAddress(accountId: string, shieldedAddress: string): Promise<boolean> {
    return zpAccounts[accountId].isOwnAddress(shieldedAddress);
  },

  async rawState(accountId: string): Promise<any> {
    return zpAccounts[accountId].getWholeState();
  },

  async free(accountId: string): Promise<void> {
    return zpAccounts[accountId].free();
  },

  async generateAddress(accountId: string): Promise<string> {
    return zpAccounts[accountId].generateAddress();
  },

  async createDepositPermittable(accountId: string, deposit: IDepositPermittableData): Promise<any> {
    return zpAccounts[accountId].createDepositPermittable(deposit);
  },

  async createTransferOptimistic(accountId: string, tx: ITransferData, optimisticState: any): Promise<any> {
    return zpAccounts[accountId].createTransferOptimistic(tx, optimisticState);
  },

  async createWithdrawalOptimistic(accountId: string, tx: IWithdrawData, optimisticState: any): Promise<any> {
    return zpAccounts[accountId].createWithdrawalOptimistic(tx, optimisticState);
  },

  async createDeposit(accountId: string, deposit: IDepositData): Promise<any> {
    return zpAccounts[accountId].createDeposit(deposit);
  },

  async createTransfer(accountId: string, transfer: ITransferData): Promise<any> {
    return zpAccounts[accountId].createTransfer(transfer);
  },

  async nextTreeIndex(accountId: string): Promise<bigint> {
    return zpAccounts[accountId].nextTreeIndex();
  },

  async firstTreeIndex(accountId: string): Promise<bigint | undefined> {
    return zpAccounts[accountId].firstTreeIndex();
  },

  async getRoot(accountId: string): Promise<string> {
    return zpAccounts[accountId].getRoot();
  },

  async getRootAt(accountId: string, index: bigint): Promise<string> {
    return zpAccounts[accountId].getRootAt(index);
  },

  async getLeftSiblings(accountId: string, index: bigint): Promise<TreeNode[]> {
    return zpAccounts[accountId].getLeftSiblings(index);
  },

  async rollbackState(accountId: string, index: bigint): Promise<bigint> {
    return zpAccounts[accountId].rollbackState(index);
  },

  async wipeState(accountId: string): Promise<void> {
    return zpAccounts[accountId].wipeState();
  },

  async getTreeLastStableIndex(accountId: string): Promise<bigint> {
    return zpAccounts[accountId].treeGetStableIndex();
  },

  async setTreeLastStableIndex(accountId: string, index: bigint): Promise<void> {
    return zpAccounts[accountId].treeSetStableIndex(index);
  },

  async updateState(accountId: string, stateUpdate: StateUpdate, siblings?: TreeNode[]): Promise<void> {
    return zpAccounts[accountId].updateState(stateUpdate, siblings);
  },

  async updateStateColdStorage(accountId: string, bulks: Uint8Array[], indexFrom?: bigint, indexTo?: bigint): Promise<ParseTxsColdStorageResult> {
    return zpAccounts[accountId].updateStateColdStorage(bulks, indexFrom, indexTo);
  },

  async verifyTxProof(inputs: string[], proof: SnarkProof): Promise<boolean> {
    const vk = await txParams.getVk();  // will throw error if VK fetch fail
    return wasm.Proof.verify(vk, inputs, proof);
  },

  async verifyShieldedAddress(shieldedAddress: string): Promise<boolean> {
    return wasm.validateAddress(shieldedAddress);
  },

  async assembleAddress(d: string, p_d: string): Promise<string> {
    return wasm.assembleAddress(d, p_d);
  },
  async genBurnerAddress(poolId: number, seed: Uint8Array): Promise<string> {
    return wasm.genBurnerAddress(BigInt(poolId), seed);
  }
};

expose(obj);
