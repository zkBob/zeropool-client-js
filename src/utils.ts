import { Privkey } from 'hdwallet-babyjub';
import { numberToHex, padLeft } from 'web3-utils';

import { NetworkType } from './network-type';
import { InternalError } from './errors';

const util = require('ethereumjs-util');

// It's a healthy-man function
export function deriveSpendingKey(mnemonic: string, networkType: NetworkType): Uint8Array {
  const path = NetworkType.privateDerivationPath(networkType);
  const sk = bigintToArrayLe(Privkey(mnemonic, path).k);

  return sk;
}

// And here is a smoker's variant of above implementation :D
export function deriveSpendingKeyZkBob(mnemonic: string, networkType: NetworkType): Uint8Array {
  if (networkType == NetworkType.polygon || networkType == NetworkType.sepolia) {
    // There are few factors why we introduce this hack here:
    //  1. zkBob prod deployment on Polygon was made with `ethereum` environment variable
    //  2. `polygon` network type was not implemented in this library at the moment of zkBob prod deployment
    //  3. staging deployment on Sepolia was also using `ethereum` network type
    //  4. `hdwallet-babyjub` npm package had an error which lead to similar HD path for every network
    //  5. we can't change HD path for existing prod users because their assets will become losed
    return bigintToArrayLe(Privkey(mnemonic, "m/0'/0'").k);
  }

  return deriveSpendingKey(mnemonic, networkType);
}

const HEX_TABLE: string[] = [];
for (let n = 0; n <= 0xff; ++n) {
  const octet = n.toString(16).padStart(2, '0');
  HEX_TABLE.push(octet);
}

export function concatenateBuffers(buf1: Uint8Array, buf2: Uint8Array): Uint8Array {
  var res = new Uint8Array(buf1.byteLength + buf2.byteLength);
  res.set(buf1, 0);
  res.set(buf2, buf1.byteLength);

  return res;
}

export function bufToHex(buffer: Uint8Array): string {
  const octets = new Array(buffer.length);

  for (let i = 0; i < buffer.length; ++i)
    octets[i] = (HEX_TABLE[buffer[i]]);

  return octets.join('');
}

export function base64ToHex(data: string): string {
  const bytes = atob(data);
  const octets = new Array(bytes.length);

  for (let i = 0; i < bytes.length; ++i) {
    octets[i] = HEX_TABLE[bytes.charCodeAt(i)];
  }

  return octets.join('');
}

export function bigintToArrayLe(num: bigint): Uint8Array {
  let result = new Uint8Array(32);

  for (let i = 0; num > BigInt(0); ++i) {
    result[i] = Number(num % BigInt(256));
    num = num / BigInt(256);
  }

  return result;
}

export function truncateHexPrefix(data: string): string {
  if (data.startsWith('0x')) {
    data = data.slice(2);
  }

  return data;
}

export function addHexPrefix(data: string): string {
  if (data.startsWith('0x') == false) {
    data = `0x` + data;
  }

  return data;
}

export function ethAddrToBuf(address: string): Uint8Array {
  return hexToBuf(address, 20);
}

// Convert input hex number to the bytes array
// extend (leading zero-bytes) or trim (trailing bytes)
// output buffer to the bytesCnt bytes (only when bytesCnt > 0)
export function hexToBuf(hex: string, bytesCnt: number = 0): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new InternalError('Invalid hex string');
  }

  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }

  if (bytesCnt > 0) {
    const digitsNum = bytesCnt * 2;
    hex = hex.slice(-digitsNum).padStart(digitsNum, '0');
  }

  const buffer = new Uint8Array(hex.length / 2);

  for (let i = 0; i < hex.length; i = i + 2) {
    buffer[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }

  return buffer;
}

export function isEqualBuffers(buf1: Uint8Array, buf2: Uint8Array): boolean {
  if (buf1.length != buf2.length) {
    return false;
  }

  for (let i = 0; i < buf1.length; i++) {
    if(buf1[i] != buf2[i]) {
      return false;
    }
  }

  return true;
}


export class HexStringWriter {
  buf: string;

  constructor() {
    this.buf = '0x';
  }

  toString() {
    return this.buf;
  }

  writeHex(hex: string) {
    this.buf += hex;
  }

  writeBigInt(num: bigint, numBytes: number) {
    this.buf += toTwosComplementHex(num, numBytes);
  }

  writeBigIntArray(nums: bigint[], numBytes: number) {
    for (let num of nums) {
      this.writeBigInt(num, numBytes);
    }
  }

  writeNumber(num: number, numBytes: number) {
    this.buf += padLeft(numberToHex(num).slice(2), numBytes * 2);
  }
}

export class HexStringReader {
  data: string;
  curIndex: number;

  constructor(data: string) {
    if (data.slice(0, 2) == '0x') {
      data = data.slice(2);
    }

    this.data = data;
    this.curIndex = 0;
  }

  readHex(numBytes: number): string | null {
    const sliceEnd = this.curIndex + numBytes * 2;

    if (sliceEnd > this.data.length) {
      return null;
    }

    const res = this.data.slice(this.curIndex, sliceEnd);
    this.curIndex = sliceEnd;
    return res;
  }

  readNumber(numBytes: number, le: boolean = false): number | null {
    let hex = this.readHex(numBytes);
    if (!hex) return null;

    if (le) {
      hex = hex.match(/../g)!.reverse().join('');
    }
    return parseInt(hex, 16);
  }

  readBigInt(numBytes: number, le: boolean = false): bigint | null {
    let hex = this.readHex(numBytes);
    if (!hex) return null;
    if (le) {
      hex = hex.match(/../g)!.reverse().join('')
    }
    return BigInt('0x' + hex);
  }

  readSignedBigInt(numBytes: number, le: boolean = false): bigint | null {
    let unsignedNum = this.readBigInt(numBytes, le);
    const msbMask = (BigInt(1) << BigInt(numBytes * 8 - 1));
    if (unsignedNum && (unsignedNum & msbMask)) {

      unsignedNum -= BigInt(1) << BigInt(numBytes * 8);
    }

    return unsignedNum;
  }


  readBigIntArray(numElements: number, numBytesPerElement: number, le: boolean = false): bigint[] {
    const elements: bigint[] = [];
    for (let i = 0; i < numElements; ++i) {
      const num = this.readBigInt(numBytesPerElement, le);
      if (!num) {
        break;
      }

      elements.push(num);
    }

    return elements;
  }

  readHexToTheEnd(): string | null {
    if (this.curIndex > this.data.length) {
      return null;
    }

    const res = this.data.slice(this.curIndex, this.data.length);
    this.curIndex = this.data.length;
    return res;
  }
}

export function toTwosComplementHex(num: bigint, numBytes: number): string {
  let hex;
  if (num < 0) {
    let val = BigInt(2) ** BigInt(numBytes * 8) + num;
    hex = val.toString(16);
  } else {
    hex = num.toString(16);
  }

  return padLeft(hex, numBytes * 2);
}

export function toCompactSignature(signature: string): string {
  signature = truncateHexPrefix(signature);

  if (signature.length > 128) {
    // it seems it's an extended signature, let's compact it!
    let v = signature.substr(128, 2);
    if (v == "1c") {
      return `${signature.slice(0, 64)}${(parseInt(signature[64], 16) | 8).toString(16)}${signature.slice(65, 128)}`;
    } else if (v != "1b") {
      throw ("invalid signature: v should be 27 or 28");
    }

    return signature.slice(0, 128);
  } else if (signature.length < 128) {
    throw ("invalid signature: it should consist at least 64 bytes (128 chars)");
  }

  // it seems the signature already compact
  return signature;
}

export function parseCompactSignature(signature: string): {v: string, r: string, s: string} {
  signature = truncateHexPrefix(signature);

  if (signature.length == 128) {
    const r = `0x${signature.substr(0, 64)}`;
    let s = `0x${signature.slice(64)}`;
    
    let v = `0x1b`;
    let sHiDigit = parseInt(s[0], 16);
    if (sHiDigit > 7) {
      v = `0x1c`;
      s = `0x${(sHiDigit & 7).toString(16)}${s.slice(1)}`;
    }

    return {v, r, s};

  }else {
    throw ("invalid signature length");
  }

}

export function toCanonicalSignature(signature: string): string {
  let sig = truncateHexPrefix(signature);

  let v = "1b";
  if (parseInt(sig[64], 16) > 7) {
    v = "1c";
    sig = sig.substr(0, 64) + `${(parseInt(sig[64], 16) & 7).toString(16)}` + sig.slice(65);
  }
  return `0x` + sig + v;
}

export function addressFromSignature(signature: string, signedData: string): string {
  let sigFields = util.fromRpcSig(addHexPrefix(signature));

  const dataBuf = hexToBuf(signedData);
  const prefix = Buffer.from("\x19Ethereum Signed Message:\n");
  const prefixedSignedData = util.keccak(
    Buffer.concat([prefix, Buffer.from(String(dataBuf.length)), dataBuf])
  );

  let pub = util.ecrecover(prefixedSignedData, sigFields.v, sigFields.r, sigFields.s);
  let addrBuf = util.pubToAddress(pub);

  return addHexPrefix(bufToHex(addrBuf));
}