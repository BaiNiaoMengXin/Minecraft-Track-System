

export class FriendlyByteBuf {
    static readonly DEAFAULT_INITIAL_CAPACITY = 64;
    static readonly DEAFAULT_MAX_CAPACITY = 1024 * 1024 * 2; // 2MB
    static readonly UTF_MAX_LENGTH = 32767;
    static readonly VARINT_MAX_BYTES = 5;
    static readonly VARLONG_MAX_BYTES = 10;

    protected buffer: ArrayBuffer;
    protected bufferView: DataView;
    protected position: number = 0;
    protected readPosition: number = 0;
    protected readonly maxCapacity: number;
    protected readonly isLittleEndain: boolean = false;
    protected readonly textEncoder = new TextEncoder();
    protected readonly textDecoder = new TextDecoder('utf-8');

    public constructor(initailCapacity: number = FriendlyByteBuf.DEAFAULT_INITIAL_CAPACITY, maxCapacity: number = FriendlyByteBuf.DEAFAULT_MAX_CAPACITY) {
        this.validateCapacity(initailCapacity, maxCapacity);

        this.buffer = new ArrayBuffer(initailCapacity);
        this.bufferView = new DataView(this.buffer);
        this.maxCapacity = maxCapacity;
    }

    protected validateCapacity(initial: number, max: number) {
        if (initial <= 0) { throw new Error("Initial capacity must be positive"); }
        if (max <= 0) { throw new Error("Max capacity must be positive"); }
        if (initial > max) { throw new Error("Initial capacity cannot exceed max capacity"); }
    }

    protected resize(required: number) {
        if (required > this.maxCapacity) {
            throw new Error(`Buffer capacity exceeded: ${required} > ${this.maxCapacity}`);
        }
        let newSize = Math.max(this.buffer.byteLength * 2, required);
        newSize = Math.min(newSize, this.maxCapacity);

        const newBuffer = new ArrayBuffer(newSize);
        new Uint8Array(newBuffer).set(new Uint8Array(this.buffer, 0, this.position));

        this.buffer = newBuffer;
        this.bufferView = new DataView(this.buffer);
    }

    protected ensureWritable(needed: number) {
        const required = this.position + needed;
        if (required > this.buffer.byteLength) {
            this.resize(required)
        }
    }

    protected ensureReadable(needed: number) {
        if (this.readPosition + needed > this.position) {
            throw new Error(`Not enough data to read: need ${needed} bytes, have ${this.position - this.readPosition}`);
        }
    }

    public writeInt(value: number): this {
        this.ensureWritable(4);
        this.bufferView.setInt32(this.position, value, this.isLittleEndain);
        this.position += 4;
        return this;
    }

    public writeShort(value: number): this {
        this.ensureWritable(2);
        this.bufferView.setInt16(this.position, value, this.isLittleEndain);
        this.position += 2;
        return this;
    }

    public writeLong(value: number): this;
    public writeLong(value: bigint): this;
    public writeLong(value: bigint | number): this {
        this.ensureWritable(8);
        this.bufferView.setBigInt64(this.position, BigInt(value), this.isLittleEndain);
        this.position += 8;
        return this;
    }

    public writeFloat(value: number): this {
        this.ensureWritable(4);
        this.bufferView.setFloat32(this.position, value, this.isLittleEndain);
        this.position += 4;
        return this;
    }

    public writeDouble(value: number): this {
        this.ensureWritable(8);
        this.bufferView.setFloat64(this.position, value, this.isLittleEndain);
        this.position += 8;
        return this;
    }

    public writeBoolean(value: boolean): this {
        return this.writeByte(value ? 1 : 0);
    } 

    public writeByte(value: number): this {
        this.ensureWritable(1);
        this.bufferView.setUint8(this.position, value);
        this.position += 1;
        return this;
    }

    public writeBytes(bytes: ArrayBuffer | ArrayBufferView): this {
        let uint8Bytes: Uint8Array;
        if (ArrayBuffer.isView(bytes)) {
            uint8Bytes = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        } else {
            uint8Bytes = new Uint8Array(bytes);
        }
        this.ensureWritable(uint8Bytes.length);
        const targetView = new Uint8Array(this.buffer, this.position, uint8Bytes.length);
        targetView.set(uint8Bytes);
        this.position += uint8Bytes.length;
        return this;
    }


    protected static zigZagEncode32(n: number): number {
        return (n << 1) ^ (n >> 31);
    }

    protected static zigZagDecode32(n: number): number {
        return (n >>> 1) ^ -(n & 1);
    }

    protected static zigZagEncode64(n: bigint): bigint {
        return (n << 1n) ^ (n >> 63n);
    }

    protected static zigZagDecode64(n: bigint): bigint {
        return (n >> 1n) ^ -(n & 1n);
    }


    public writeVarInt(value: number): this {
        value = FriendlyByteBuf.zigZagEncode32(value);
        value = value >>> 0;
        while (true) {
            if ((value & ~0x7F) === 0) {
                this.writeByte(value);
                return this;
            }
            this.writeByte((value & 0x7F) | 0x80);
            value >>>= 7;
        }
    }

    public writeVarLong(value: bigint): this {
        value = FriendlyByteBuf.zigZagEncode64(value);
        while (true) {
            if ((value & ~0x7Fn) === 0n) {
                this.writeByte(Number(value));
                return this;
            }
            this.writeByte(Number((value & 0x7Fn) | 0x80n));
            value >>= 7n;
        }
    }

    public writeUtf(str: string, maxLength: number = FriendlyByteBuf.UTF_MAX_LENGTH): this {
        if (str.length > maxLength) {
            throw new Error(`String too long (${str.length} > ${maxLength})`);
        }
        const encoded = this.textEncoder.encode(str);
        if (encoded.length > maxLength * 4) {
            throw new Error(`Encoded string too long`);
        }
        this.writeVarInt(encoded.length);
        this.writeBytes(encoded);
        return this;
    }


    public readInt(): number {
        this.ensureReadable(4);
        const value = this.bufferView.getInt32(this.readPosition, this.isLittleEndain);
        this.readPosition += 4;
        return value;
    }

    public readShort(): number {
        this.ensureReadable(2);
        const value = this.bufferView.getInt16(this.readPosition, this.isLittleEndain);
        this.readPosition += 2;
        return value;
    }

    public readLong(): bigint {
        this.ensureReadable(8);
        const value = this.bufferView.getBigInt64(this.readPosition, this.isLittleEndain);
        this.readPosition += 8;
        return value;
    }

    public readFloat(): number {
        this.ensureReadable(4);
        const value = this.bufferView.getFloat32(this.readPosition, this.isLittleEndain);
        this.readPosition += 4;
        return value;
    }

    public readDouble(): number {
        this.ensureReadable(8);
        const value = this.bufferView.getFloat64(this.readPosition, this.isLittleEndain);
        this.readPosition += 8;
        return value;
    }

    public readBoolean(): boolean {
        return this.readByte() !== 0;
    } 

    public readByte(): number {
        this.ensureReadable(1);
        const value = this.bufferView.getUint8(this.readPosition);
        this.readPosition += 1;
        return value;
    }

    public readBytes(length: number): Uint8Array {
        this.ensureReadable(length);
        const bytes = new Uint8Array(this.buffer, this.readPosition, length);
        this.readPosition += length;
        return bytes;
    }

    public readVarInt(): number {
        let value = 0;
        let shift = 0;
        let byte: number;
        let bytesRead = 0;
        
        do {
            byte = this.readByte();
            bytesRead++;
            if (bytesRead > FriendlyByteBuf.VARINT_MAX_BYTES) {
                throw new Error(`VarInt is too big`);
            }
            value |= (byte & 0x7F) << shift;
            shift += 7;
            if (shift >= 32) {
                throw new Error("VarInt is too big");
            }
        } while ((byte & 0x80) !== 0)

        return FriendlyByteBuf.zigZagDecode32(value);
    }

    public readVarLong(): bigint {
        let result = 0n;
        let shift = 0n;
        let byte: bigint;
        let bytesRead = 0;
        
        do {
            byte = BigInt(this.readByte());
            bytesRead++;
            if (bytesRead > FriendlyByteBuf.VARLONG_MAX_BYTES) {
                throw new Error(`VarLong is too big`);
            }
            result |= (byte & 0x7Fn) << shift;
            shift += 7n;
            if (shift >= 64n) {
                throw new Error("VarLong is too big");
            }
        } while ((byte & 0x80n) !== 0n)

        return FriendlyByteBuf.zigZagDecode64(result);
    }

    public readUtf(maxLength: number = FriendlyByteBuf.UTF_MAX_LENGTH) {
        const length = this.readVarInt();
        if (length < 0) {
            throw new Error("Invalid string length");
        }
        if (length > maxLength * 4) {
            throw new Error("String too long");
        }
        const bytes = this.readBytes(length);
        const str = this.textDecoder.decode(bytes)

        if (str.length > maxLength) {
            throw new Error("String too long");
        }
        return str;
    }
}
