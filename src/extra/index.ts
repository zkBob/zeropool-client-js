import { HexStringWriter, bufToHex, concatenateBuffers, hexToBuf } from "../utils";
import { InternalError } from "../errors";

export enum ExtraItemType {
    Text = 0,
    Json = 1,
}

export enum ExtraItemFlags {
    None = 0,
    Encrypted = 1 << 0,
    Padded    = 1 << 1,
}


abstract class ExtraItem {
    // total serialized size including all of headers
    public size(): number {
        return 4 + // fixed header
               this.flags & ExtraItemFlags.Encrypted ? 16 : 0 + 
               this.flags & ExtraItemFlags.Padded ? 2 + this.padLength : 0 + 
               this.payload().length;
    }

    public index: number;   // which tx leaf item belongs to (0 - account, 1..128 - note, 0xff - whole tx)
    public flags: ExtraItemFlags;

    public abstract type: ExtraItemType; // which type of content item contains
    public padLength: number;

    public abstract payload(): Uint8Array;


    public serialize(): Uint8Array {
        const hdrWriter = new HexStringWriter();
        const itemSize = this.size();
        if (itemSize >= 2 ** 16) {
            throw new InternalError('Extra item size too large');
        }
        hdrWriter.writeNumber(this.size(), 2);
        hdrWriter.writeNumber(this.index, 1);
        hdrWriter.writeNumber(this.flags, 1);

        const bodyWriter = new HexStringWriter();
        bodyWriter.writeNumber(this.type as number, 1);
        if (this.flags & ExtraItemFlags.Padded) {
            bodyWriter.writeNumber(this.padLength, 2);
            bodyWriter.writeHex('00'.repeat(this.padLength));
        }
        bodyWriter.writeHex(bufToHex(this.payload()));

        let bodyBuffer = hexToBuf(bodyWriter.toString());
        if (this.flags & ExtraItemFlags.Encrypted) {
            // TODO: encrypt item
        }

        return concatenateBuffers(hexToBuf(hdrWriter.toString()), bodyBuffer);
    }

    public deserialize(data: Uint8Array) {

    }
}

