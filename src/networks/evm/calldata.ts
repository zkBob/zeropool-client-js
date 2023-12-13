import { InternalError } from "../../errors";
import { ShieldedTx, RegularTxType, TxMemoVersion, CURRENT_MEMO_VERSION } from "../../tx";
import { HexStringReader, assertNotNull } from "../../utils";
import { PoolSelector } from ".";


// Sizes in bytes
const MEMO_META_DEFAULT_SIZE: number = 8; // fee (u64)
const MEMO_META_WITHDRAW_SIZE: number = 8 + 8 + 20; // fee (u64) + amount + address (u160)
const MEMO_META_PERMITDEPOSIT_SIZE: number = 8 + 8 + 20; // fee (u64) + amount + address (u160)

export const CALLDATA_BASE_LENGTH: number = 644;
export const CALLDATA_MEMO_APPROVE_DEPOSIT_BASE_LENGTH: number = 210;
export const CALLDATA_MEMO_DEPOSIT_BASE_LENGTH: number = 238;
export const CALLDATA_MEMO_TRANSFER_BASE_LENGTH: number = 210;
export const CALLDATA_MEMO_NOTE_LENGTH: number = 172;
export const CALLDATA_MEMO_WITHDRAW_BASE_LENGTH: number = 238;
export const CALLDATA_DEPOSIT_SIGNATURE_LENGTH: number = 64;


export function estimateEvmCalldataLength(txType: RegularTxType, notesCnt: number, extraDataLen: number = 0): number {
  let txSpecificLen = 0;
  switch (txType) {
    case RegularTxType.Deposit:
      txSpecificLen = CALLDATA_MEMO_APPROVE_DEPOSIT_BASE_LENGTH + CALLDATA_DEPOSIT_SIGNATURE_LENGTH;
      break;

    case RegularTxType.BridgeDeposit:
      txSpecificLen = CALLDATA_MEMO_DEPOSIT_BASE_LENGTH + CALLDATA_DEPOSIT_SIGNATURE_LENGTH;
      break;

    case RegularTxType.Transfer:
      txSpecificLen = CALLDATA_MEMO_TRANSFER_BASE_LENGTH;
      break;

    case RegularTxType.Withdraw:
      txSpecificLen = CALLDATA_MEMO_WITHDRAW_BASE_LENGTH;
      break;
  }

  return CALLDATA_BASE_LENGTH + txSpecificLen + extraDataLen + notesCnt * CALLDATA_MEMO_NOTE_LENGTH;
}

export function decodeEvmCalldata(calldata: string): ShieldedTx {
  const tx = new ShieldedTx();
  const reader = new HexStringReader(calldata);

  const selector = reader.readHex(4)!;
  if (selector.toLocaleLowerCase() != PoolSelector.Transact) {
      throw new InternalError(`[EvmNetwork] Cannot decode transaction: incorrect selector ${selector} (expected ${PoolSelector.Transact})`);
  }
  
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
  tx.memoVer = reader.readNumber(1) as TxMemoVersion;
  assertNotNull(tx.memoVer);
  if (tx.memoVer > CURRENT_MEMO_VERSION) {
    throw new InternalError('Unsupported memo version');
  }
  tx.txType = reader.readHex(1) as RegularTxType;
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

export function getCiphertext(tx: ShieldedTx): string {
  if (tx.txType === RegularTxType.Withdraw) {
    return tx.memo.slice(MEMO_META_WITHDRAW_SIZE * 2);
  } else if (tx.txType === RegularTxType.BridgeDeposit) {
    return tx.memo.slice(MEMO_META_PERMITDEPOSIT_SIZE * 2);
  }

  return tx.memo.slice(MEMO_META_DEFAULT_SIZE * 2);
}

export function decodeEvmCalldataAppendDD(calldata: string) {
  
}