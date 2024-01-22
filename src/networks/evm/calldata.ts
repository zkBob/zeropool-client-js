import { InternalError } from "../../errors";
import { ShieldedTx, RegularTxType, TxCalldataVersion, CURRENT_CALLDATA_VERSION } from "../../tx";
import { HexStringReader, assertNotNull } from "../../utils";
import { PoolSelector } from ".";


// Calldata components length universal reference
export class CalldataInfo {
  static baseLength(ver: TxCalldataVersion = CURRENT_CALLDATA_VERSION): number {
    switch (ver) {
      case TxCalldataVersion.V1: return 644;
      case TxCalldataVersion.V2: return 357;
      default: throw new InternalError(`Unknown calldata version: ${ver}`);
    }
  };

  static memoApproveDepositBaseLength(ver: TxCalldataVersion = CURRENT_CALLDATA_VERSION): number {
    switch (ver) {
      case TxCalldataVersion.V1: return 210;
      case TxCalldataVersion.V2: return 232;
      default: throw new InternalError(`Unknown calldata version: ${ver}`);
    }
  };

  static memoPermitDepositBaseLength(ver: TxCalldataVersion = CURRENT_CALLDATA_VERSION): number {
    switch (ver) {
      case TxCalldataVersion.V1: return 238;
      case TxCalldataVersion.V2: return 260;
      default: throw new InternalError(`Unknown calldata version: ${ver}`);
    }
  };

  static memoTransferBaseLength(ver: TxCalldataVersion = CURRENT_CALLDATA_VERSION): number {
    switch (ver) {
      case TxCalldataVersion.V1: return 210;
      case TxCalldataVersion.V2: return 232;
      default: throw new InternalError(`Unknown calldata version: ${ver}`);
    }
  };

  static memoNoteBaseLength(ver: TxCalldataVersion = CURRENT_CALLDATA_VERSION): number {
    return 172;
  };

  static memoWithdrawBaseLength(ver: TxCalldataVersion = CURRENT_CALLDATA_VERSION): number {
    switch (ver) {
      case TxCalldataVersion.V1: return 238;
      case TxCalldataVersion.V2: return 260;
      default: throw new InternalError(`Unknown calldata version: ${ver}`);
    }
  };

  static depositSignatureLength(ver: TxCalldataVersion = CURRENT_CALLDATA_VERSION): number {
    return 64;
  };

  static memoTxSpecificFieldsLength(
    txType: RegularTxType,
    ver: TxCalldataVersion = CURRENT_CALLDATA_VERSION
  ): number {
    switch (ver) {
      case TxCalldataVersion.V1:
        switch (txType) {
          case RegularTxType.BridgeDeposit: return 8 + 8 + 20; // fee (u64) + deadline (u64) + holder (u160)
          case RegularTxType.Deposit: case RegularTxType.Transfer: return 8; // fee (u64)
          case RegularTxType.Withdraw: return 8 + 8 + 20; // fee (u64) + native_amount (u64) + address (u160)
          default: throw new InternalError(`Unknown transaction type: ${txType}`);
        }
      case TxCalldataVersion.V2:
        switch (txType) {
          case RegularTxType.BridgeDeposit:
            // proxy_address (u160) + proxy_fee (u64) + prover_fee (u64) + deadline (u64) + holder (u160)
            return 20 + 8 + 8 + 8 + 20;
          case RegularTxType.Deposit: case RegularTxType.Transfer:
            // proxy_address (u160) + proxy_fee (u64) + prover_fee (u64)
            return 20 + 8 + 8;
          case RegularTxType.Withdraw:
            // proxy_address (u160) + proxy_fee (u64) + prover_fee (u64) + native_amount (u64) + address (u160)
            return 28 + 8 + 8 + 8 + 20;
          default: throw new InternalError(`Unknown transaction type: ${txType}`);
        }
      default: throw new InternalError(`Unknown calldata version: ${ver}`);
    }
  }
}

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

  const selector = reader.readHex(4)?.toLowerCase()!;
  switch (selector) {
    case PoolSelector.Transact:
      tx.version = TxCalldataVersion.V1;
      break;
    case PoolSelector.TransactV2:
      tx.version = (reader.readNumber(1) as TxCalldataVersion);
      if (tx.version > CURRENT_CALLDATA_VERSION) {
        throw new InternalError('Unsupported calldata version');
      }
      break;
    default:
      throw new InternalError(`[CalldataDecoder] Cannot decode transaction: incorrect selector ${selector} (expected ${PoolSelector.Transact} or ${PoolSelector.TransactV2})`);
  };
  tx.nullifier = reader.readBigInt(32)!;
  tx.outCommit = reader.readBigInt(32)!;
  tx.transferIndex = reader.readBigInt(6)!;
  tx.energyAmount = reader.readSignedBigInt(14)!;
  tx.tokenAmount = reader.readSignedBigInt(8)!;
  tx.transactProof = reader.readBigIntArray(8, 32);

  if (selector == PoolSelector.Transact) {
    tx.rootAfter = reader.readBigInt(32)!;
    tx.treeProof = reader.readBigIntArray(8, 32);
  }
  
  tx.txType = reader.readHex(2) as RegularTxType;
  const memoSize = reader.readNumber(2);
  assertNotNull(memoSize);
  tx.memo = reader.readHex(memoSize)!;

  // Additional data appended to the end of calldata
  // It contains deposit holder signature for deposit transactions
  // or any other data which user can append
  tx.extra = reader.readHexToTheEnd()!;

  // verify all read successfully
  assertNotNull(tx.nullifier);
  assertNotNull(tx.outCommit);
  assertNotNull(tx.transferIndex);
  assertNotNull(tx.energyAmount);
  assertNotNull(tx.tokenAmount);
  assertNotNull(tx.rootAfter);
  assertNotNull(tx.version);
  assertNotNull(tx.txType);
  assertNotNull(tx.memo);
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