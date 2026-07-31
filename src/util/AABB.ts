import { Double } from "jLib/Math";
import { Mth } from "./math/Mth";
import { Vec3 } from "./math/Vec3";
import { Direction } from "./math/Direction";
import { JavaObject } from "jLib/Object";
import * as server from "@minecraft/server";

export class AABB implements JavaObject {

    public readonly minX: number;
    public readonly minY: number;
    public readonly minZ: number;
    public readonly maxX: number;
    public readonly maxY: number;
    public readonly maxZ: number;
    
    public constructor(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number);

    public constructor(pos1: server.Vector3, pos2: server.Vector3);

    public constructor(pos: server.Vector3);

    public constructor(arg1: number | server.Vector3, arg2?: number | server.Vector3, z1?: number, x2?: number, y2?: number, z2?: number) {
        if (z1 != undefined) {
            this.minX = Math.min(arg1 as number, x2!);
            this.minY = Math.min(arg2 as number, y2!);
            this.minZ = Math.min(z1, z2!);
            this.maxX = Math.max(arg1 as number, x2!);
            this.maxY = Math.max(arg2 as number, y2!);
            this.maxZ = Math.max(z1, z2!);
        } else if (arg2 != undefined) {
            let pos1 = arg1 as server.Vector3;
            let pos2 = arg2 as server.Vector3;
            this.minX = Math.min(pos1.x, pos2.x);
            this.minY = Math.min(pos1.y, pos2.y);
            this.minZ = Math.min(pos1.z, pos2.z);
            this.maxX = Math.max(pos1.x, pos2.x);
            this.maxY = Math.max(pos1.y, pos2.y);
            this.maxZ = Math.max(pos1.z, pos2.z);
        } else {
            let pos = arg1 as server.Vector3;
            this.minX = Math.min(pos.x, pos.x + 1);
            this.minY = Math.min(pos.y, pos.y + 1);
            this.minZ = Math.min(pos.z, pos.z + 1);
            this.maxX = Math.max(pos.x, pos.x + 1);
            this.maxY = Math.max(pos.y, pos.y + 1);
            this.maxZ = Math.max(pos.z, pos.z + 1);
        }
    }

    public static fromServerAABB(aabb: server.AABB) {
        return this.ofSize(aabb.center.x, aabb.center.y, aabb.center.z, aabb.extent.x, aabb.extent.y, aabb.extent.z);
    }
    
    public static ofSize(centerX: number, centerY: number, centerZ: number, 
                              xSize: number, ySize: number, zSize: number): AABB {
        let halfX = xSize / 2.0;
        let halfY = ySize / 2.0;
        let halfZ = zSize / 2.0;
        return new AABB(centerX - halfX, centerY - halfY, centerZ - halfZ,
                       centerX + halfX, centerY + halfY, centerZ + halfZ);
    }
    
    public intersects(other: AABB): boolean {
        return this.minX < other.maxX && this.maxX > other.minX &&
               this.minY < other.maxY && this.maxY > other.minY &&
               this.minZ < other.maxZ && this.maxZ > other.minZ;
    }
    
    public contains(other: AABB): boolean;
    public contains(pos: server.Vector3): boolean;
    public contains(x: number, y: number, z: number): boolean;

    public contains(arg1: AABB | server.Vector3 | number, y?: number, z?: number): boolean {
        if (arg1 instanceof AABB) {
            const other = arg1;
            return this.minX <= other.minX && this.maxX >= other.maxX &&
               this.minY <= other.minY && this.maxY >= other.maxY &&
               this.minZ <= other.minZ && this.maxZ >= other.maxZ;
        } else if (typeof arg1 != "number") {
            return arg1.x >= this.minX && arg1.x <= this.maxX &&
                arg1.y >= this.minY && arg1.y <= this.maxY &&
                arg1.z >= this.minZ && arg1.z <= this.maxZ;
        } else {
            const x = arg1 as number;
            return x >= this.minX && x <= this.maxX &&
                y! >= this.minY && y! <= this.maxY &&
                z! >= this.minZ && z! <= this.maxZ;
        }
    }
    
    public inflate(x: number, y: number, z: number): AABB;
    public inflate(v: number): AABB;

    public inflate(arg1: number, y?: number, z?: number): AABB {
        if (y != undefined) {
            const x = arg1;
            let newMinX = this.minX - x;
            let newMinY = this.minY - y;
            let newMinZ = this.minZ - z!;
            let newMaxX = this.maxX + x;
            let newMaxY = this.maxY + y;
            let newMaxZ = this.maxZ + z!;
            return new AABB(newMinX, newMinY, newMinZ, newMaxX, newMaxY, newMaxZ);
        } else {
            return this.inflate(arg1, arg1, arg1)
        }
    }
    
    public expandTowards(x: number, y: number, z: number): AABB {
        let newMinX = this.minX;
        let newMinY = this.minY;
        let newMinZ = this.minZ;
        let newMaxX = this.maxX;
        let newMaxY = this.maxY;
        let newMaxZ = this.maxZ;
        
        if (x < 0.0) newMinX += x;
        else if (x > 0.0) newMaxX += x;
        
        if (y < 0.0) newMinY += y;
        else if (y > 0.0) newMaxY += y;
        
        if (z < 0.0) newMinZ += z;
        else if (z > 0.0) newMaxZ += z;
        
        return new AABB(newMinX, newMinY, newMinZ, newMaxX, newMaxY, newMaxZ);
    }
    
    public deflate(x: number, y: number, z: number): AABB {
        return this.inflate(-x, -y, -z);
    }
    
    public move(x: number, y: number, z: number): AABB;
    public move(pos: Vec3): AABB;

    public move(arg1: number | Vec3, y?: number, z?: number): AABB {
        if (y != undefined) {
            const x = arg1 as number;
            return new AABB(this.minX + x, this.minY + y, this.minZ + z!,
                    this.maxX + x, this.maxY + y, this.maxZ + z!);
        } else {
            const pos = arg1 as Vec3
            return new AABB(this.minX + pos.getX(), this.minY + pos.getY(), this.minZ + pos.getZ(),
                    this.maxX + pos.getX(), this.maxY + pos.getY(), this.maxZ + pos.getZ()); 
        }
        
    }
    
    public intersect(other: AABB): AABB | null {
        let newMinX = Math.max(this.minX, other.minX);
        let newMinY = Math.max(this.minY, other.minY);
        let newMinZ = Math.max(this.minZ, other.minZ);
        let newMaxX = Math.min(this.maxX, other.maxX);
        let newMaxY = Math.min(this.maxY, other.maxY);
        let newMaxZ = Math.min(this.maxZ, other.maxZ);
        
        if (newMinX >= newMaxX || newMinY >= newMaxY || newMinZ >= newMaxZ) {
            return null;
        }
        
        return new AABB(newMinX, newMinY, newMinZ, newMaxX, newMaxY, newMaxZ);
    }
    
    public minmax(other: AABB): AABB {
        let newMinX = Math.min(this.minX, other.minX);
        let newMinY = Math.min(this.minY, other.minY);
        let newMinZ = Math.min(this.minZ, other.minZ);
        let newMaxX = Math.max(this.maxX, other.maxX);
        let newMaxY = Math.max(this.maxY, other.maxY);
        let newMaxZ = Math.max(this.maxZ, other.maxZ);
        
        return new AABB(newMinX, newMinY, newMinZ, newMaxX, newMaxY, newMaxZ);
    }
    
    public getSize(): number {
        let dx = this.maxX - this.minX;
        let dy = this.maxY - this.minY;
        let dz = this.maxZ - this.minZ;
        return (dx + dy + dz) / 3.0;
    }
    
    public getXsize(): number {
        return this.maxX - this.minX;
    }
    
    public getYsize(): number {
        return this.maxY - this.minY;
    }
    
    public getZsize(): number {
        return this.maxZ - this.minZ;
    }
    
    public getCenter(): Vec3 {
        return new Vec3(
            (this.minX + this.maxX) / 2.0,
            (this.minY + this.maxY) / 2.0,
            (this.minZ + this.maxZ) / 2.0
        );
    }
    
    public getNearestPointTo(point: Vec3): Vec3 {
        let nearestX = Mth.clamp(point.x, this.minX, this.maxX);
        let nearestY = Mth.clamp(point.y, this.minY, this.maxY);
        let nearestZ = Mth.clamp(point.z, this.minZ, this.maxZ);
        return new Vec3(nearestX, nearestY, nearestZ);
    }
    
    public distanceToSqr(point: Vec3): number;
    public distanceToSqr(x: number, y: number, z: number): number;
    public distanceToSqr(other: AABB): number;

    public distanceToSqr(arg1: Vec3 | number | AABB, y?: number, z?: number): number {
        if (y == undefined && arg1 instanceof Vec3) {
            const point = arg1 as Vec3;
            let dx = Math.max(Math.max(this.minX - point.x, 0), point.x - this.maxX);
            let dy = Math.max(Math.max(this.minY - point.y, 0), point.y - this.maxY);
            let dz = Math.max(Math.max(this.minZ - point.z, 0), point.z - this.maxZ);
            return dx * dx + dy * dy + dz * dz;
        } else if (y != undefined) {
            const x = arg1 as number;
            let dx = Math.max(Math.max(this.minX - x, 0), x - this.maxX);
            let dy = Math.max(Math.max(this.minY - y, 0), y - this.maxY);
            let dz = Math.max(Math.max(this.minZ - z!, 0), z! - this.maxZ);
            return dx * dx + dy * dy + dz * dz;
        } else {
            const other = arg1 as AABB;
            let dx = Math.max(Math.max(this.minX - other.maxX, 0), other.minX - this.maxX);
            let dy = Math.max(Math.max(this.minY - other.maxY, 0), other.minY - this.maxY);
            let dz = Math.max(Math.max(this.minZ - other.maxZ, 0), other.minZ - this.maxZ);
            return dx * dx + dy * dy + dz * dz;
        }
    }
    
    public clip(from: Vec3, to: Vec3): Vec3 | null {
        const tMinMax = this.getIntersectionPercents(from, to);
        if (tMinMax == null || tMinMax[0] > tMinMax[1]) {
            return null;
        }
        
        let t = tMinMax[0] < 0.0 ? tMinMax[1] : tMinMax[0];
        if (t < 0.0 || t > 1.0) {
            return null;
        }
        
        const hitPoint = new Vec3(
            from.x + (to.x - from.x) * t,
            from.y + (to.y - from.y) * t,
            from.z + (to.z - from.z) * t
        );
        
        return hitPoint;
    }
    
    private getIntersectionPercents(from: Vec3, to: Vec3): [number, number] | null {
        let tMin = 0.0;
        let tMax = 1.0;
        
        let dx = to.x - from.x;
        let dy = to.y - from.y;
        let dz = to.z - from.z;
        
        for (let i = 0; i < 3; i++) {
            let min, max, origin, direction;
            
            if (i == 0) {
                min = this.minX; max = this.maxX; origin = from.x; direction = dx;
            } else if (i == 1) {
                min = this.minY; max = this.maxY; origin = from.y; direction = dy;
            } else {
                min = this.minZ; max = this.maxZ; origin = from.z; direction = dz;
            }
            
            if (Math.abs(direction) < 1.0E-7) {
                if (origin < min || origin > max) {
                    return null;
                }
            } else {
                let t1 = (min - origin) / direction;
                let t2 = (max - origin) / direction;
                
                if (t1 > t2) {
                    let temp = t1;
                    t1 = t2;
                    t2 = temp;
                }
                
                tMin = Math.max(tMin, t1);
                tMax = Math.min(tMax, t2);
                
                if (tMin > tMax) {
                    return null;
                }
            }
        }
        
        return [tMin, tMax];
    }
    
    public min(axis: Direction.Axis): number {
        switch (axis) {
            case Direction.Axis.X: return this.minX;
            case Direction.Axis.Y: return this.minY;
            case Direction.Axis.Z: return this.minZ;
            default: return 0.0;
        }
    }
    
    public max(axis: Direction.Axis): number {
        switch (axis) {
            case Direction.Axis.X: return this.maxX;
            case Direction.Axis.Y: return this.maxY;
            case Direction.Axis.Z: return this.maxZ;
            default: return 0.0;
        }
    }
    
    public hasNaN(): boolean {
        return isNaN(this.minX) || isNaN(this.minY) || isNaN(this.minZ) ||
               isNaN(this.maxX) || isNaN(this.maxY) || isNaN(this.maxZ);
    }
    
    public isValid(): boolean {
        return this.minX <= this.maxX && this.minY <= this.maxY && this.minZ <= this.maxZ;
    }
    
    public toString(): string {
        return "AABB[" + this.minX + ", " + this.minY + ", " + this.minZ + 
               "] -> [" + this.maxX + ", " + this.maxY + ", " + this.maxZ + "]";
    }
    
    public equals(obj: object): boolean {
        if (this == obj) return true;
        if (obj == null || obj instanceof AABB) return false;
        
        const other = obj as AABB;
        return Double.compare(other.minX, this.minX) == 0 &&
               Double.compare(other.minY, this.minY) == 0 &&
               Double.compare(other.minZ, this.minZ) == 0 &&
               Double.compare(other.maxX, this.maxX) == 0 &&
               Double.compare(other.maxY, this.maxY) == 0 &&
               Double.compare(other.maxZ, this.maxZ) == 0;
    }
}
