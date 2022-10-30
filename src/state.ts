import { hash } from 'tweetnacl';

import { UserAccount, UserState } from 'libzkbob-rs-wasm-web';
import { bufToHex } from './utils';
import { HistoryStorage } from './history'
import { EphemeralPool } from './ephemeral';

export class ZkBobState {
  public denominator: bigint;
  public account: UserAccount;
  public history: HistoryStorage;
  public ephemeralPool: EphemeralPool;

  public static async create(
    sk: Uint8Array,
    networkName: string,
    tokenAddress: string,
    rpcUrl: string,
    denominator: bigint
  ): Promise<ZkBobState> {
    const zpState = new ZkBobState();
    zpState.denominator = denominator;
    const userId = bufToHex(hash(sk));
    const state = await UserState.init(`zp.${networkName}.${userId}`);
    zpState.history = await HistoryStorage.init(`zp.${networkName}.${userId}`, rpcUrl);
    zpState.ephemeralPool = await EphemeralPool.init(sk, tokenAddress, rpcUrl);

    try {
      const acc = new UserAccount(sk, state);
      zpState.account = acc;
    } catch (e) {
      console.error(e);
    }

    return zpState;
  }

  // in Gwei
  public getTotalBalance(): bigint {
    return BigInt(this.account.totalBalance());
  }

  // in Gwei
  public getBalances(): [bigint, bigint, bigint] {
    const total = BigInt(this.account.totalBalance());
    const acc = BigInt(this.account.accountBalance());
    const note = BigInt(this.account.noteBalance());

    return [total, acc, note];
  }

  // in Gwei
  public accountBalance(): bigint {
    return BigInt(this.account.accountBalance());
  }

  public usableNotes(): any[] {
    return this.account.getUsableNotes();
  }

  public isOwnAddress(shieldedAddress: string): boolean {
    return this.account.isOwnAddress(shieldedAddress);
  }

  public getRoot(): bigint {
    return BigInt(this.account.getRoot());
  }

  public getNextIndex(): bigint {
    return BigInt(this.account.nextTreeIndex());
  }

  public rawState(): any {
    return this.account.getWholeState();
  }

  // TODO: implement thiss method
  public async clean(): Promise<void> {
    //await this.account.cleanState();
    await this.history.cleanHistory();
  }

  public free(): void {
    this.account.free();
  }
}
