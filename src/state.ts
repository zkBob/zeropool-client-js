import { IDepositData, IDepositPermittableData, ITransferData, IWithdrawData, StateUpdate, TreeNode } from 'libzkbob-rs-wasm-web';
import { HistoryStorage } from './history'
import { bufToHex } from './utils';
import { hash } from 'tweetnacl';
import { EphemeralPool } from './ephemeral';
import { NetworkType } from './network-type';

export class ZkBobState {
  public denominator: bigint;
  public history: HistoryStorage;
  public ephemeralPool: EphemeralPool;
  public tokenAddress: string;
  public worker: any;
  
  // Mapping shieldedAddress -> isOwnAddress (local cache)
  // need to decrease time in isOwnAddress() function 
  private shieldedAddressCache = new Map<string, Promise<boolean>>();

  public static async create(sk: Uint8Array, networkName: string, rpcUrl: string, denominator: bigint, tokenAddress: string, worker: any): Promise<ZkBobState> {
    const zpState = new ZkBobState();
    zpState.denominator = denominator;
    
    const userId = bufToHex(hash(sk));
    await worker.createAccount(tokenAddress, sk, networkName, userId);
    zpState.tokenAddress = tokenAddress;
    zpState.worker = worker;
    zpState.history = await HistoryStorage.init(`zp.${networkName}.${userId}`, rpcUrl, worker);

    let network = networkName as NetworkType;
    zpState.ephemeralPool = await EphemeralPool.init(sk, tokenAddress, network, rpcUrl, denominator);

    return zpState;
  }

  // in Gwei
  public async getTotalBalance(): Promise<bigint> {
    return BigInt(await this.worker.totalBalance(this.tokenAddress));
  }

  // in Gwei
  public async getBalances(): Promise<[bigint, bigint, bigint]> {
    const total = BigInt(await this.worker.totalBalance(this.tokenAddress));
    const acc = BigInt(await this.worker.accountBalance(this.tokenAddress));
    const note = BigInt(await this.worker.noteBalance(this.tokenAddress));

    return [total, acc, note];
  }

  // in Gwei
  public async accountBalance(): Promise<bigint> {
    return BigInt(await this.worker.accountBalance(this.tokenAddress));
  }

  public async usableNotes(): Promise<any[]> {
    return await this.worker.usableNotes(this.tokenAddress);
  }

  public async isOwnAddress(shieldedAddress: string): Promise<boolean> {
    let res = this.shieldedAddressCache.get(shieldedAddress);
    if (res === undefined) {
      res = this.worker.isOwnAddress(this.tokenAddress, shieldedAddress);
      this.shieldedAddressCache.set(shieldedAddress, res!);
    }

    return res!;
  }

  public async getRoot(): Promise<bigint> {
    return BigInt(await this.worker.getRoot(this.tokenAddress));
  }

  public async getRootAt(index: bigint): Promise<bigint> {
    return BigInt(await this.worker.getRootAt(this.tokenAddress, index));
  }

  public async getLeftSiblings(index: bigint): Promise<TreeNode[]> {
    return await this.worker.getLeftSiblings(this.tokenAddress, index);
  }

  public async getNextIndex(): Promise<bigint> {
    return await this.worker.nextTreeIndex(this.tokenAddress);
  }

  public async getFirstIndex(): Promise<bigint | undefined> {
    return await this.worker.firstTreeIndex(this.tokenAddress);
  }

  public async rawState(): Promise<any> {
    return await this.worker.rawState(this.tokenAddress);
  }

  // Wipe whole user's state
  public async rollback(rollbackIndex: bigint): Promise<bigint> {
    const realRollbackIndex = await this.worker.rollbackState(this.tokenAddress, rollbackIndex);
    await this.history.rollbackHistory(Number(realRollbackIndex));

    return realRollbackIndex;
  }

  // Wipe whole user's state
  public async clean(): Promise<void> {
    await this.worker.wipeState(this.tokenAddress);
    await this.history.cleanHistory();
  }

  public async free(): Promise<void> {
    await this.worker.free(this.tokenAddress);
  }

  public async generateAddress(): Promise<string> {
    return await this.worker.generateAddress(this.tokenAddress);
  }

  public async createDepositPermittable(deposit: IDepositPermittableData): Promise<any> {
    return await this.worker.createDepositPermittable(this.tokenAddress, deposit);
  }

  public async createTransferOptimistic(tx: ITransferData, optimisticState: any): Promise<any> { 
    return await this.worker.createTransferOptimistic(this.tokenAddress, tx, optimisticState);
  }

  public async createWithdrawalOptimistic(tx: IWithdrawData, optimisticState: any): Promise<any> {
    return await this.worker.createWithdrawalOptimistic(this.tokenAddress, tx, optimisticState);
  }

  public async createDeposit(deposit: IDepositData): Promise<any> {
    return await this.worker.createDeposit(this.tokenAddress, deposit);
  }

  public async createTransfer(transfer: ITransferData): Promise<any> {
    return await this.worker.createTransfer(this.tokenAddress, transfer);
  }

  public async updateState(stateUpdate: StateUpdate, siblings?: TreeNode[]): Promise<void> {
    return await this.worker.updateState(this.tokenAddress, stateUpdate, siblings);
  }

  public async lastVerifiedIndex(): Promise<bigint> {
    return await this.worker.getTreeLastStableIndex(this.tokenAddress);
  }

  public async setLastVerifiedIndex(index: bigint): Promise<bigint> {
    return await this.worker.setTreeLastStableIndex(this.tokenAddress, index);
  }
}
