import { Vector3 } from "@minecraft/server";
import { JavaObject } from "jLib/Object";


export class Vec3 implements JavaObject {
    public x: number;
    public y: number;
    public z: number;

    
    constructor(x : number, y : number, z : number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static fromVector3(v: Vector3): Vec3 {
        return new Vec3(v.x, v.y, v.z);
    }

    /**
     * 绕Y轴旋转向量（偏航角旋转）
     * 对应Minecraft的Vec3.yRot
     * @param this 原始向量
     * @param degrees 旋转角度（度）
     * @returns 旋转后坐标
     */
    yRot_Degrees(degrees: number): Vec3 {
        const radians = degrees * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        return new Vec3(
            this.x * cos + this.z * sin,
            this.y,
            this.z * cos - this.x * sin
        );
    }

    /**
     * 绕X轴旋转向量（俯仰角旋转）
     */
    xRot_Degrees(degrees: number): Vec3 {
        const radians = degrees * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        return new Vec3(
            this.x,
            this.y * cos + this.z * sin,
            this.z * cos - this.y * sin
        );
    }

    /**
     * 绕Z轴旋转向量（滚转角旋转）
     */
    zRot_Degrees(degrees: number): Vec3 {
        const radians = degrees * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        return new Vec3(
            this.x * cos + this.y * sin,
            this.y * cos - this.x * sin,
            this.z
        );
    }
    
    /**
     * 绕Y轴旋转向量（偏航角旋转）
     * 对应Minecraft的Vec3.yRot
     * @param this 原始向量
     * @param radians 旋转角度（弧）
     */
    yRot(radians: number): Vec3 {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        return new Vec3(
            this.x * cos + this.z * sin,
            this.y,
            this.z * cos - this.x * sin

        
            // this.x * cos - this.z * sin,
            // this.y,
            // this.x * sin + this.z * cos
        )
    }

    /**
     * 绕X轴旋转向量（俯仰角旋转）
     */
    xRot(radians: number): Vec3 {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        return new Vec3(
            this.x,
            this.y * cos + this.z * sin,
            this.z * cos - this.y * sin
        );
    }

    /**
     * 绕Z轴旋转向量（滚转角旋转）
     */
    zRot(radians: number): Vec3 {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        
        return new Vec3(
            this.x * cos + this.y * sin,
            this.y * cos - this.x * sin,
            this.z
        );
    }

    subtract(x: number, y: number, z: number): Vec3;
    subtract(other: Vec3): Vec3;

    subtract(arg1: number | Vec3, y?: number, z?: number): Vec3 {
        if (typeof arg1 == "number") {
            return new Vec3(this.x - arg1, this.y - y!, this.z - z!);
        } else {
            const other = arg1 as Vector3;
            return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z);
        }
    }

    add(vec: Vec3): Vec3;
    add(x: number, y: number, z: number): Vec3;

    add(arg1: Vec3 | number, y?: number, z?: number): Vec3 {
        if (y === undefined) {
            const v = arg1 as Vec3;
            return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
        } else {
            return new Vec3(this.x + (arg1 as number), this.y + y, this.z + z!);
        }
    }

    multiply(num: number): Vec3;
	multiply(x: number, y: number, z: number): Vec3;

	multiply(arg1: number, arg2?: number, arg3?: number): Vec3 {
        let x = arg1;
        let y = arg2;
        let z = arg3;

        if (y === undefined || z === undefined) {
            y = x;
            z = x;
        }

		return new Vec3(this.x * x, this.y * y, this.z * z);
	}

    lerp(v: Vec3, t: number): Vec3 {
        if (t === 1)
            return v;
        if (t === 0)
            return this;
        return new Vec3(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t, this.z + (v.z - this.z) * t);
    }

    equals(other: Vec3): boolean {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    distSqr(v: Vector3): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }

    distanceTo(v: Vector3): number {
        return Math.sqrt(this.distSqr(v));
    }

    distManhattan(v: Vec3): number {
        return Math.abs(this.x - v.x) + Math.abs(this.y - v.y) + Math.abs(this.z - v.z);
    }
   
	normalize(): Vec3 {
		const d = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
		return d < 1.0E-5 ? new Vec3(0, 0, 0) : new Vec3(this.x / d, this.y / d, this.z / d);
	}

    getX() { return this.x; }

    getY() { return this.y; }

    getZ() { return this.z; }
}

