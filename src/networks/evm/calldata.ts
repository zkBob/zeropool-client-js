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

  static memoBaseLength(txType: RegularTxType, ver: TxCalldataVersion = CURRENT_CALLDATA_VERSION): number {
    switch (ver) {
      case TxCalldataVersion.V1:
        switch (txType) {
          case RegularTxType.BridgeDeposit:
          case RegularTxType.Withdraw: 
            return 238;
          case RegularTxType.Deposit:
          case RegularTxType.Transfer:
            return 210;
          default: throw new InternalError(`Unknown transaction type: ${txType}`);
        }
      case TxCalldataVersion.V2:
        switch (txType) {
          case RegularTxType.BridgeDeposit:
          case RegularTxType.Withdraw:
            return 260;
          case RegularTxType.Deposit:
          case RegularTxType.Transfer:
            return 232;
          default: throw new InternalError(`Unknown transaction type: ${txType}`);
        }
      default: throw new InternalError(`Unknown calldata version: ${ver}`);
    }
  };

  static memoNoteLength(ver: TxCalldataVersion = CURRENT_CALLDATA_VERSION): number {
    return 172;
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

  static estimateEvmCalldataLength(ver: TxCalldataVersion, txType: RegularTxType, notesCnt: number, extraDataLen: number = 0): number {
    let txSpecificLen = CalldataInfo.memoBaseLength(txType, ver);
    if (txType == RegularTxType.Deposit || txType == RegularTxType.BridgeDeposit) {
      txSpecificLen += CalldataInfo.depositSignatureLength(ver);
    }
  
    return CalldataInfo.baseLength(ver) + txSpecificLen + extraDataLen + notesCnt * CalldataInfo.memoNoteLength(ver);
  }
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
  return tx.memo.slice(CalldataInfo.memoTxSpecificFieldsLength(tx.txType, tx.version) * 2);
}

export function decodeEvmCalldataAppendDD(calldata: string) {
  
}