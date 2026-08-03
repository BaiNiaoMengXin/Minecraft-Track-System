import { JavaObject } from "jLib/Object";
import { Direction } from "./Direction";

/**
 * Please do not "JSON.strify" it; use its "asJson" method instead.
 */
export class BlockPos implements JavaObject {

    public static readonly ZERO = new BlockPos(0, 0, 0);

    private static readonly SIZE_BITS_XZ = 26;
    private static readonly SIZE_BITS_Y = 12;
    private static readonly BITS_X = (1n << 26n) - 1n;
    private static readonly BITS_Y = (1n << 12n) - 1n;
    private static readonly BITS_Z = (1n << 26n) - 1n;
    private static readonly BIT_SHIFT_Z = 12n;
    private static readonly BIT_SHIFT_X = 38n;

    // private static readonly int64Array = new BigInt64Array(1)

    private _x: number = 0;
    private _y: number = 0;
    private _z: number = 0;

    private get x() { return ~~this._x; }
    private get y() { return ~~this._y; }
    private get z() { return ~~this._z; }

    private set x(v: number) { this._x = ~~v; }
    private set y(v: number) { this._y = ~~v; }
    private set z(v: number) { this._z = ~~v; }

    constructor(json: { x: number, y: number, z: number });

    constructor(x: number, y: number, z: number);

    constructor(arg1: { x: number, y: number, z: number } | number, y?: number, z?: number) {
        if (y != undefined && z != undefined) {
            this.x = arg1 as number;
            this.y = y;
            this.z = z;
        } else {
            const json = arg1 as { x: number, y: number, z: number };
            this.x = json.x;
            this.y = json.y;
            this.z = json.z;
        }
    }

    yRot(radians: number): BlockPos {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        return new BlockPos(
            this.x * cos + this.z * sin,
            this.y,
            this.z * cos - this.x * sin

        
            // this.x * cos - this.z * sin,
            // this.y,
            // this.x * sin + this.z * cos
        )
    }

    xRot(radians: number): BlockPos {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        return new BlockPos(
            this.x,
            this.y * cos + this.z * sin,
            this.z * cos - this.y * sin
        );
    }

    zRot(radians: number): BlockPos {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        return new BlockPos(
            this.x * cos + this.y * sin,
            this.y * cos - this.x * sin,
            this.z
        );
    }

    subtract(other: BlockPos): BlockPos {
        return new BlockPos(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    offset(x: number, y: number, z: number): BlockPos;
    offset(vec: BlockPos): BlockPos;

    offset(arg1: BlockPos | number, y?: number, z?: number): BlockPos {
        if (typeof arg1 === 'number') {
            return new BlockPos(this.x + arg1, this.y + y!, this.z + z!);
        }
        return new BlockPos(this.x + arg1.x, this.y + arg1.y, this.z + arg1.z);
    }

    multiply(num: number): BlockPos;
    multiply(x: number, y: number, z: number): BlockPos;

    multiply(arg1: number, y?: number, z?: number): BlockPos {
        if (y == undefined) {
            return new BlockPos(this.x * arg1, this.y * arg1, this.z * arg1);
        }
        return new BlockPos(this.x * arg1, this.y * y, this.z * z!);
    }

    lerp(v: BlockPos, t: number): BlockPos {
        if (t === 1)
            return v;
        if (t === 0)
            return this;
        return new BlockPos(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t, this.z + (v.z - this.z) * t);
    }

    equals(other: BlockPos): boolean {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    distSqr(v: BlockPos): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return ~~(dx * dx + dy * dy + dz * dz);
    }

    distanceTo(v: BlockPos): number {
        return ~~(Math.sqrt(this.distSqr(v)));
    }

    distManhattan(v: BlockPos): number {
        return ~~(Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z));
    }
   
    normalize(): BlockPos {
        const d = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        return d < 1.0E-5 ? new BlockPos(0, 0, 0) : new BlockPos(this.x / d, this.y / d, this.z / d);
    }

    relative(direction: Direction, steps: number = 1): BlockPos {
        return steps == 0 ? this : new BlockPos(this.x + direction.getStepX() * steps, this.y + direction.getStepY() * steps, this.z + direction.getStepZ() * steps);
    }

    above(steps: number = 1): BlockPos {
        return steps == 0 ? this : new BlockPos(this.x, this.y + Direction.UP.getStepY() * steps, this.z);
    }

    below(steps: number = 1): BlockPos {
        return steps == 0 ? this : new BlockPos(this.x, this.y + Direction.DOWN.getStepY() * steps, this.z);
    }

    getX() { return this.x; }

    getY() { return this.y; }

    getZ() { return this.z; }

    asJson() {
        return {
            x: this.x,
            y: this.y,
            z: this.z
        }
    }

    asLong(): bigint {
        return BlockPos.asLong(this.x, this.y, this.z);
    }

    static asLong(x: number, y: number, z: number): bigint {
        let packed = 0n
        packed |= (BigInt(x) & this.BITS_X) << this.BIT_SHIFT_X;
        packed |= (BigInt(y) & this.BITS_Y);
        packed |= (BigInt(z) & this.BITS_Z) << this.BIT_SHIFT_Z;
        return packed;
    }

    static fromLong(packedPos: bigint): BlockPos {
        packedPos = BigInt.asIntN(64, packedPos)

        let x = Number((packedPos >> this.BIT_SHIFT_X) & this.BITS_X);
        if (x & (1 << (this.SIZE_BITS_XZ - 1))) {
            x -= (1 << this.SIZE_BITS_XZ);
        }

        let y = Number(packedPos & this.BITS_Y);
        if (y & (1 << (this.SIZE_BITS_Y - 1))) {
            y -= (1 << this.SIZE_BITS_Y);
        }

        let z = Number((packedPos >> this.BIT_SHIFT_Z) & this.BITS_Z);
        if (z & (1 << (this.SIZE_BITS_XZ - 1))) {
            z -= (1 << this.SIZE_BITS_XZ);
        }

        return new BlockPos(x, y, z);
    }

    // ----Number version---
    // asLong(): number {
    //     return BlockPos.asLong(this.x, this.y, this.z);
    // }

    // static asLong(x: number, y: number, z: number): number {
    //     let packed = 0n
    //     packed |= (BigInt(x) & this.BITS_X) << this.BIT_SHIFT_X;
    //     packed |= (BigInt(y) & this.BITS_Y);
    //     packed |= (BigInt(z) & this.BITS_Z) << this.BIT_SHIFT_Z;
    //     return Number(BlockPos.int64Array.fill(packed)[0]);
    // }

    // static fromLong(packedPos: number): BlockPos {
    //     const packedPos2 = this.int64Array.fill(BigInt(packedPos))[0]
    //     let x = Number((packedPos2 >> this.BIT_SHIFT_X) & this.BITS_X);
    //     if (x & (1 << (this.SIZE_BITS_XZ - 1))) {
    //         x -= (1 << this.SIZE_BITS_XZ);
    //     }

    //     let y = Number(packedPos2 & this.BITS_Y);
    //     if (y & (1 << (this.SIZE_BITS_Y - 1))) {
    //         y -= (1 << this.SIZE_BITS_Y);
    //     }

    //     let z = Number((packedPos2 >> this.BIT_SHIFT_Z) & this.BITS_Z);
    //     if (z & (1 << (this.SIZE_BITS_XZ - 1))) {
    //         z -= (1 << this.SIZE_BITS_XZ);
    //     }

    //     return new BlockPos(x, y, z);
    // }
    // ----End----
}

