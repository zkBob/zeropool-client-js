import Web3 from 'web3';

import { TransactionData, SnarkProof, UserAccount } from 'libzkbob-rs-wasm-web';
import { HexStringReader, HexStringWriter } from './utils';
import { CONSTANTS } from './constants';
import { InternalError } from './errors';

// Sizes in bytes
const MEMO_META_DEFAULT_SIZE: number = 8; // fee (u64)
const MEMO_META_WITHDRAW_SIZE: number = 8 + 8 + 20; // fee (u64) + amount + address (u160)
const MEMO_META_PERMITDEPOSIT_SIZE: number = 8 + 8 + 20; // fee (u64) + amount + address (u160)

export enum TxType {
  Deposit = '0000',
  Transfer = '0001',
  Withdraw = '0002',
  BridgeDeposit = '0003',
}

export function txTypeToString(txType: TxType): string {
  switch (txType) {
    case TxType.Deposit: return 'deposit';
    case TxType.Transfer: return 'transfer';
    case TxType.Withdraw: return 'withdraw';
    case TxType.BridgeDeposit: return 'bridge-deposit';
  }
}

/** The universal transaction data format used on most networks. */
export class ShieldedTx {
  public selector: string;
  public nullifier: bigint;
  public outCommit: bigint;
  public transferIndex: bigint;
  public energyAmount: bigint;
  public tokenAmount: bigint;
  public transactProof: bigint[];
  public rootAfter: bigint;
  public treeProof: bigint[];
  public txType: TxType;
  public memo: string;
  public extra: string;

  static async fromData(
    txData: TransactionData,
    txType: TxType,
    acc: UserAccount,
    web3: Web3,
    worker: any,
  ): Promise<ShieldedTx> {
    const tx = new ShieldedTx();

    const nextIndex = acc.nextTreeIndex() as bigint;
    let curIndex = nextIndex - BigInt(CONSTANTS.OUT + 1);
    if (curIndex < BigInt(0)) {
      curIndex = BigInt(0);
    }

    const prevCommitmentIndex = curIndex / BigInt(2 ** CONSTANTS.OUTLOG);
    const nextCommitmentIndex = acc.nextTreeIndex() as bigint / BigInt(2 ** CONSTANTS.OUTLOG);

    const proofFilled = acc.getCommitmentMerkleProof(prevCommitmentIndex);
    const proofFree = acc.getCommitmentMerkleProof(nextCommitmentIndex);

    const prevLeaf = acc.getMerkleNode(CONSTANTS.OUTLOG, prevCommitmentIndex);
    const rootBefore = acc.getRoot();
    const rootAfter = acc.getMerkleRootAfterCommitment(nextCommitmentIndex, txData.commitment_root);

    const txProof = await worker.proveTx(txData.public, txData.secret);
    const treeProof = await worker.proveTree({
      root_before: rootBefore,
      root_after: rootAfter,
      leaf: txData.commitment_root,
    }, {
      proof_filled: proofFilled,
      proof_free: proofFree,
      prev_leaf: prevLeaf,
    });

    const txValid = worker.verifyTxProof(txProof.inputs, txProof.proof);
    if (!txValid) {
      throw new InternalError('invalid tx proof');
    }

    const treeValid = worker.verifyTreeProof(treeProof.inputs, treeProof.proof);
    if (!treeValid) {
      throw new InternalError('invalid tree proof');
    }

    tx.selector = web3.eth.abi.encodeFunctionSignature('transact()').slice(2);
    tx.nullifier = BigInt(txData.public.nullifier);
    tx.outCommit = BigInt(txData.public.out_commit);

    tx.transferIndex = BigInt(txData.parsed_delta.index);
    tx.energyAmount = BigInt(txData.parsed_delta.e);
    tx.tokenAmount = BigInt(txData.parsed_delta.v);

    tx.transactProof = flattenSnarkProof(txProof.proof);
    tx.rootAfter = BigInt(rootAfter);
    tx.treeProof = flattenSnarkProof(treeProof.proof);
    tx.txType = txType;

    tx.memo = txData.memo;

    tx.extra = "";

    return tx;
  }

  get ciphertext(): string {
    if (this.txType === TxType.Withdraw) {
      return this.memo.slice(MEMO_META_WITHDRAW_SIZE * 2);
    } else if (this.txType === TxType.BridgeDeposit) {
      return this.memo.slice(MEMO_META_PERMITDEPOSIT_SIZE * 2);
    }

    return this.memo.slice(MEMO_META_DEFAULT_SIZE * 2);
  }

  get hashes(): string[] {
    const ciphertext = this.ciphertext;
    return parseHashes(ciphertext);
  }

  /**
   * Returns encoded transaction ready to use as data for the smart contract.
   */
  encode(): string {
    const writer = new HexStringWriter();

    writer.writeHex(this.selector);
    writer.writeBigInt(this.nullifier, 32);
    writer.writeBigInt(this.outCommit, 32);
    writer.writeBigInt(this.transferIndex, 6);
    writer.writeBigInt(this.energyAmount, 14);
    writer.writeBigInt(this.tokenAmount, 8);
    writer.writeBigIntArray(this.transactProof, 32);
    writer.writeBigInt(this.rootAfter, 32);
    writer.writeBigIntArray(this.treeProof, 32);
    writer.writeHex(this.txType.toString());
    writer.writeNumber(this.memo.length / 2, 2);
    writer.writeHex(this.memo);

    if (this.extra.length > 0) {
      writer.writeHex(this.extra);
    }

    return writer.toString();
  }

  static decode(data: string): ShieldedTx {
    const tx = new ShieldedTx();
    const reader = new HexStringReader(data);

    tx.selector = reader.readHex(4)!;
    assertNotNull(tx.selector);
    tx.nullifier = reader.readBigInt(32)!;
    assertNotNull(tx.nullifier);
    tx.outCommit = reader.readBigInt(32)!;
    assertNotNull(tx.outCommit);
    tx.transferIndex = reader.readBigInt(6)!;
    assertNotNull(tx.transferIndex);
    tx.energyAmount = reader.readSignedBigInt(14)!;
    assertNotNull(tx.energyAmount);
    tx.tokenAmount = reader.readSignedBigInt(8)!;
    assertNotNull(tx.tokenAmount);
    tx.transactProof = reader.readBigIntArray(8, 32);
    tx.rootAfter = reader.readBigInt(32)!;
    assertNotNull(tx.rootAfter);
    tx.treeProof = reader.readBigIntArray(8, 32);
    tx.txType = reader.readHex(2) as TxType;
    assertNotNull(tx.txType);
    const memoSize = reader.readNumber(2);
    assertNotNull(memoSize);
    tx.memo = reader.readHex(memoSize)!;
    assertNotNull(tx.memo);

    // Extra data
    // It contains deposit holder signature for deposit transactions
    // or any other data which user can append
    tx.extra = reader.readHexToTheEnd()!;
    assertNotNull(tx.extra);

    return tx;
  }
}

export function parseHashes(ciphertext: string): string[] {
  const reader = new HexStringReader(ciphertext);
  const numItems = reader.readNumber(4, true);
  if (!numItems || numItems > CONSTANTS.OUT + 1) {
    throw new InternalError(`Invalid transaction: invalid number of outputs ${numItems}`);
  }

  const hashes = reader.readBigIntArray(numItems, 32, true).map(num => num.toString());

  return hashes;
}

export function flattenSnarkProof(p: SnarkProof): bigint[] {
  return [p.a, p.b.flat(), p.c].flat().map(n => {
    return BigInt(n);
  });
}

function assertNotNull<T>(val: T): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    throw new InternalError('Unexpected null');
  }
}
