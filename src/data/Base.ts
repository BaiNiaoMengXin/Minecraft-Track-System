import { Entity, Vector2, Player, Vector3, Dimension, MolangVariableMap, RGB, RGBA, world, VectorXZ, EntityType, SpawnEntityOptions, system, DimensionLocation, BlockPermutation, RawMessage } from "@minecraft/server";
import { Vec3 } from "util/math/Vec3";
import { Mth } from "util/math/Mth";

/**
 * 生成极高唯一性的数字ID（Snowflake算法变种）
 * 结构：时间戳(42位) + 随机机器ID(10位) + 序列号(12位)
 * 支持到公元2248年，单机每毫秒可生成4096个不重复ID
 */
export function generateUniqueNumberID(): number {
    // 静态变量（单例模式）
    const staticVars = {
        epoch: 1609459200000, // 自定义纪元开始时间(2021-01-01)
        sequence: 0,
        lastTimestamp: -1,
        machineId: Math.floor(Math.random() * 1024) // 随机机器ID(0-1023)
    };

    let timestamp = Date.now() - staticVars.epoch;

    // 同一毫秒内生成多个ID
    if (timestamp === staticVars.lastTimestamp) {
        staticVars.sequence = (staticVars.sequence + 1) & 0xFFF; // 12位序列号(0-4095)

        if (staticVars.sequence === 0) {
            // 序列号用完，等待下一毫秒
            while (Date.now() - staticVars.epoch <= timestamp) {
                // 空循环等待下一毫秒
            }
            timestamp = Date.now() - staticVars.epoch;
        }
    } else {
        staticVars.sequence = 0;
    }

    staticVars.lastTimestamp = timestamp;

    // 组合ID：时间戳(42位) | 机器ID(10位) | 序列号(12位)
    return (timestamp * 4194304) + // 左移22位 (2^22 = 4194304)
        (staticVars.machineId * 4096) + // 左移12位
        staticVars.sequence;
}

export interface Position {
    x: number;
    y: number;
    z: number;
}

export class PosHelper {
    // 使用Number的安全整数范围（53位）
    // 分配：X:18位, Y:8位, Z:18位
    private static readonly X_BITS = 18;
    private static readonly Y_BITS = 8;
    private static readonly Z_BITS = 18;

    private static readonly Y_SHIFT = this.Z_BITS;
    private static readonly X_SHIFT = this.Y_SHIFT + this.Y_BITS;

    private static readonly MASK_Z = (1 << this.Z_BITS) - 1;
    private static readonly MASK_Y = (1 << this.Y_BITS) - 1;
    private static readonly MASK_X = (1 << this.X_BITS) - 1;

    static fromVec3(v: Vec3): Position {
        return { x: v.x, y: v.y, z: v.z };
    }

    // static asLong(pos: Position): number {
    //     // 将有符号转换为无符号
    //     const encodeCoord = (val: number, bits: number): number => {
    //         if (val >= 0) return val;
    //         return (1 << bits) + val;
    //     };

    //     const x = encodeCoord(pos.x, this.X_BITS);
    //     const y = encodeCoord(pos.y, this.Y_BITS);
    //     const z = encodeCoord(pos.z, this.Z_BITS);

    //     return (x << this.X_SHIFT) | (y << this.Y_SHIFT) | z;
    // }

    // static fromLong(value: number): Position {
    //     const z = value & this.MASK_Z;
    //     const y = (value >>> this.Y_SHIFT) & this.MASK_Y;
    //     const x = (value >>> this.X_SHIFT) & this.MASK_X;

    //     // 将无符号转换回有符号
    //     const decodeCoord = (val: number, bits: number): number => {
    //         const signBit = 1 << (bits - 1);
    //         if (val & signBit) {
    //             return val - (1 << bits);
    //         }
    //         return val;
    //     };

    //     return {
    //         x: decodeCoord(x, this.X_BITS),
    //         y: decodeCoord(y, this.Y_BITS),
    //         z: decodeCoord(z, this.Z_BITS)
    //     };
    // }

    static equals(pos1: Position, pos2: Position): boolean {
        return pos1.x === pos2.x && pos1.y === pos2.y && pos1.z === pos2.z;
    }

    static distSqr(pos1: Position, pos2: Position): number {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * 计算两个位置之间的曼哈顿距离（网格距离）
     * 对应Minecraft的BlockPos.distManhattan
     * 公式：|Δx| + |Δy| + |Δz|
     */
    static distManhattan(a: Position, b: Position): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
    }

    static offset(pos: Position, dx: number, dy: number, dz: number): Position {
        return { x: pos.x + dx, y: pos.y + dy, z: pos.z + dz };
    }

    static offset_Pos(pos: Position, dPos: Position): Position {
        return { x: pos.x + dPos.x, y: pos.y + dPos.y, z: pos.z + dPos.z };
    }

    static toVectorXZ(vec3: Vector3): VectorXZ {
        return { x: vec3.x, z: vec3.z }
    }

    static PosToStr(pos: Position): string {
        return `${pos.x},${pos.y},${pos.z}`;
    }
}

/**
 * Java 风格的 TimeUnit（仅包含时间计算/转换）
 *
 * 实现要点：
 * - 提供与 java.util.concurrent.TimeUnit 相同的方法名（toNanos/toMicros/toMillis/toSeconds/toMinutes/toHours/toDays/convert）
 * - 方法同时支持 number 和 bigint 输入（重载），若传入 number 则返回 number，传入 bigint 则返回 bigint
 * - 使用 BigInt 在内部按 Java long（64 位有符号）语义进行计算，并对溢出进行饱和（Long.MAX_VALUE / Long.MIN_VALUE）处理，行为与 Java 保持一致
 *
 * 注意：Java 的 long 是 64 位整数；在 JavaScript 中使用 number 时可能超出安全整数范围，会导致精度丢失。
 * 如果需要严格的 64 位语义，请使用 bigint 版本的参数/返回值。
 */
export class TimeUnit {
    private readonly nanosPerUnit: bigint;
    private readonly name: string;

    private constructor(name: string, nanosPerUnit: bigint) {
        this.name = name;
        this.nanosPerUnit = nanosPerUnit;
    }

    // Java long 边界
    private static readonly LONG_MAX = 9223372036854775807n;
    private static readonly LONG_MIN = -9223372036854775808n;

    // 工厂/枚举实例（与 Java 的顺序一致）
    static readonly NANOSECONDS = new TimeUnit('NANOSECONDS', 1n);
    static readonly MICROSECONDS = new TimeUnit('MICROSECONDS', 1000n);
    static readonly MILLISECONDS = new TimeUnit('MILLISECONDS', 1000n * 1000n);
    static readonly SECONDS = new TimeUnit('SECONDS', 1000n * 1000n * 1000n);
    static readonly MINUTES = new TimeUnit('MINUTES', 60n * 1000n * 1000n * 1000n);
    static readonly HOURS = new TimeUnit('HOURS', 60n * 60n * 1000n * 1000n * 1000n);
    static readonly DAYS = new TimeUnit('DAYS', 24n * 60n * 60n * 1000n * 1000n * 1000n);

    // --------------------------------------------------------------------------------
    // 辅助函数：输入转换、溢出检测与输出
    // --------------------------------------------------------------------------------
    private static toBigIntFromNumber(n: number): bigint {
        // 按 Java long 行为截断小数部分（向零）
        if (!Number.isFinite(n)) {
            // 非有限数视为溢出边界
            return n > 0 ? TimeUnit.LONG_MAX : TimeUnit.LONG_MIN;
        }
        return BigInt(n >= 0 ? Math.trunc(n) : Math.trunc(n));
    }

    private static saturatingMultiply(a: bigint, b: bigint): bigint {
        // 快速判断零
        if (a === 0n || b === 0n) return 0n;
        const res = a * b;
        if (a > 0n && b > 0n && res < 0n) return TimeUnit.LONG_MAX; // overflow detection fallback
        if (a < 0n && b < 0n && res < 0n) return TimeUnit.LONG_MAX;
        if (res > TimeUnit.LONG_MAX) return TimeUnit.LONG_MAX;
        if (res < TimeUnit.LONG_MIN) return TimeUnit.LONG_MIN;
        return res;
    }

    private static saturatingAdd(a: bigint, b: bigint): bigint {
        const res = a + b;
        if (res > TimeUnit.LONG_MAX) return TimeUnit.LONG_MAX;
        if (res < TimeUnit.LONG_MIN) return TimeUnit.LONG_MIN;
        return res;
    }

    // 将 bigint 输出为对应的类型：如果原始输入是 number，则转回 number（可能失去精度）；如果是 bigint，则返回 bigint
    private static toOutput(originalIsBigInt: boolean, v: bigint): any {
        if (originalIsBigInt) return v;
        // 转为 number（注意：可能超出 Number 安全范围）
        return Number(v);
    }

    // 将任意输入（number | bigint）转换为 bigint（截断小数，向零）
    private static toInternalBigInt(value: number | bigint): bigint {
        return typeof value === 'bigint' ? value : TimeUnit.toBigIntFromNumber(value);
    }

    // --------------------------------------------------------------------------------
    // 转换方法：对外提供 number 与 bigint 两种重载版本
    // --------------------------------------------------------------------------------
    toNanos(d: number): number;
    toNanos(d: bigint): bigint;
    toNanos(d: any): any {
        const origIsBig = typeof d === 'bigint';
        const bi = TimeUnit.toInternalBigInt(d);
        const res = TimeUnit.saturatingMultiply(bi, this.nanosPerUnit);
        return TimeUnit.toOutput(origIsBig, res);
    }

    toMicros(d: number): number;
    toMicros(d: bigint): bigint;
    toMicros(d: any): any {
        const origIsBig = typeof d === 'bigint';
        const bi = TimeUnit.toInternalBigInt(d);
        const nanosBig = TimeUnit.saturatingMultiply(bi, this.nanosPerUnit);
        const res = nanosBig / 1000n;
        return TimeUnit.toOutput(origIsBig, res);
    }

    toMillis(d: number): number;
    toMillis(d: bigint): bigint;
    toMillis(d: any): any {
        const origIsBig = typeof d === 'bigint';
        const bi = TimeUnit.toInternalBigInt(d);
        const nanosBig = TimeUnit.saturatingMultiply(bi, this.nanosPerUnit);
        const res = nanosBig / 1000000n;
        return TimeUnit.toOutput(origIsBig, res);
    }

    toSeconds(d: number): number;
    toSeconds(d: bigint): bigint;
    toSeconds(d: any): any {
        const origIsBig = typeof d === 'bigint';
        const bi = TimeUnit.toInternalBigInt(d);
        const nanosBig = TimeUnit.saturatingMultiply(bi, this.nanosPerUnit);
        const res = nanosBig / 1000000000n;
        return TimeUnit.toOutput(origIsBig, res);
    }

    toMinutes(d: number): number;
    toMinutes(d: bigint): bigint;
    toMinutes(d: any): any {
        const origIsBig = typeof d === 'bigint';
        const bi = TimeUnit.toInternalBigInt(d);
        const nanosBig = TimeUnit.saturatingMultiply(bi, this.nanosPerUnit);
        const res = nanosBig / (60n * 1000000000n);
        return TimeUnit.toOutput(origIsBig, res);
    }

    toHours(d: number): number;
    toHours(d: bigint): bigint;
    toHours(d: any): any {
        const origIsBig = typeof d === 'bigint';
        const bi = TimeUnit.toInternalBigInt(d);
        const nanosBig = TimeUnit.saturatingMultiply(bi, this.nanosPerUnit);
        const res = nanosBig / (3600n * 1000000000n);
        return TimeUnit.toOutput(origIsBig, res);
    }

    toDays(d: number): number;
    toDays(d: bigint): bigint;
    toDays(d: any): any {
        const origIsBig = typeof d === 'bigint';
        const bi = TimeUnit.toInternalBigInt(d);
        const nanosBig = TimeUnit.saturatingMultiply(bi, this.nanosPerUnit);
        const res = nanosBig / (86400n * 1000000000n);
        return TimeUnit.toOutput(origIsBig, res);
    }

    /**
     * 将 sourceDuration（在 sourceUnit 单位）转换为当前单位的值（返回与传入类型一致）
     */
    convert(sourceDuration: number, sourceUnit: TimeUnit): number;
    convert(sourceDuration: bigint, sourceUnit: TimeUnit): bigint;
    convert(sourceDuration: any, sourceUnit: TimeUnit): any {
        const origIsBig = typeof sourceDuration === 'bigint';
        // 先转换为纳秒（bigint）
        const nanos = TimeUnit.toInternalBigInt(sourceDuration);
        const nanosTotal = TimeUnit.saturatingMultiply(nanos, sourceUnit.nanosPerUnit);
        // 再将纳秒除以当前单位的 nanosPerUnit
        const result = nanosTotal / this.nanosPerUnit;
        return TimeUnit.toOutput(origIsBig, result);
    }

    toString(): string {
        return `TimeUnit.${this.name}`;
    }
}

export interface EntityModelStructure {
    /** 模型位置（世界坐标） */
    position: Vector3;
    /** 模型旋转角度（弧度） */
    rotation: Vector2;
    /** 模型尺寸（长, 宽, 高） */
    size: Vector3;
}

/** 投影结果 */
interface Projection {
    min: number;
    max: number;
}

export interface Box {
    minX: number;
    minY: number;
    minZ: number;
    maxX: number;
    maxY: number;
    maxZ: number;
}

export interface OrientedBox {
    center: Vector3;
    dimensions: Vector3; // 长(x), 宽(z), 高(y)
    rotation: Vector2;     // 旋转角度 (pitch, yaw)
}

export class CollisionDetector {

    public static isPointInTwoPosBox(p1: Position, p2: Position, p: Position): boolean {
        // 获取最小和最大边界
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);

        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        const minZ = Math.min(p1.z, p2.z);
        const maxZ = Math.max(p1.z, p2.z);

        // 判断第三个点是否在边界内
        return p.x >= minX && p.x <= maxX &&
            p.y >= minY && p.y <= maxY &&
            p.z >= minZ && p.z <= maxZ;
    }

    public static isPointInTwoPosBoxIgnoreY(p1: VectorXZ, p2: VectorXZ, p: VectorXZ): boolean {
        // 获取最小和最大边界
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);

        const minZ = Math.min(p1.z, p2.z);
        const maxZ = Math.max(p1.z, p2.z);

        // 判断第三个点是否在边界内
        return p.x >= minX && p.x <= maxX &&
            p.z >= minZ && p.z <= maxZ;
    }

    /**
     * 检测玩家是否与实体模型发生碰撞（OBB vs OBB）
     * @param player 玩家实体
     * @param model 实体模型结构
     * @returns 是否发生碰撞
     */
    public static isPlayerCollidingWithModel(player: Player, model: EntityModelStructure): boolean {
        // 获取玩家OBB
        const playerOBB = this.getPlayerOBB(player);

        // 获取模型OBB
        const modelOBB = this.createOBBFromModel(model);

        // 执行SAT（分离轴定理）检测
        return this.SATTest(playerOBB, modelOBB);
    }

    /**
     * 从玩家实体获取OBB
     */
    private static getPlayerOBB(player: Player): OrientedBox {
        const pos = player.location;
        const rotation = this.getEntityRotation(player);

        return {
            center: { x: pos.x, y: pos.y + 0.9, z: pos.z }, // 玩家中心在腰部
            dimensions: { x: 0.6, y: 1.8, z: 0.6 }, // 玩家尺寸
            rotation: rotation
        };
    }

    /**
     * 从模型结构创建OBB
     */
    private static createOBBFromModel(model: EntityModelStructure): OrientedBox {
        return {
            center: model.position,
            dimensions: model.size, // 长8, 宽3, 高2
            rotation: model.rotation
        };
    }

    /**
     * 获取实体旋转角度（简化版，实际可能需要从NBT读取）
     */
    private static getEntityRotation(entity: Entity): Vector2 {
        // 这里简化处理，实际可能需要从实体NBT获取精确旋转
        return { x: 0, y: entity.getRotation().y * Mth.DEG_TO_RAD };
    }

    /**
     * 分离轴定理检测（OBB vs OBB）
     */
    private static SATTest(obbA: OrientedBox, obbB: OrientedBox): boolean {
        // 获取两个OBB的轴
        const axesA = this.getObbAxes(obbA);
        const axesB = this.getObbAxes(obbB);

        // 检测所有分离轴
        const axes = [...axesA, ...axesB];

        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                // 添加叉积轴（SAT算法要求）
                const crossAxis = this.crossProduct(axesA[i], axesB[j]);
                if (crossAxis.x !== 0 || crossAxis.y !== 0 || crossAxis.z !== 0) {
                    axes.push(this.normalize(crossAxis));
                }
            }
        }

        // 在每个轴上检测投影重叠
        for (const axis of axes) {
            if (!this.overlapOnAxis(obbA, obbB, axis)) {
                return false; // 发现分离轴，无碰撞
            }
        }

        return true; // 所有轴都重叠，发生碰撞
    }

    /**
     * 获取OBB的三个正交轴
     */
    private static getObbAxes(obb: OrientedBox): Vec3[] {
        const yaw = obb.rotation.y; // Minecraft坐标系需要取负
        const pitch = obb.rotation.x;

        // 创建基础轴向量
        const right = new Vec3(1, 0, 0);
        const up = new Vec3(0, 1, 0);
        const forward = new Vec3(0, 0, 1);

        // 应用旋转（rotation已经是弧度）
        const rotatedRight = right.yRot(yaw).xRot(pitch);
        const rotatedUp = up.yRot(yaw).xRot(pitch);
        const rotatedForward = forward.yRot(yaw).xRot(pitch);

        return [
            rotatedRight,
            rotatedUp,
            rotatedForward
        ];
    }

    /**
     * 在指定轴上检测投影重叠
     */
    private static overlapOnAxis(obbA: OrientedBox, obbB: OrientedBox, axis: Vec3): boolean {
        const projA = this.projectObb(obbA, axis);
        const projB = this.projectObb(obbB, axis);

        return projA.min <= projB.max && projB.min <= projA.max;
    }

    /**
     * 将OBB投影到指定轴上
     */
    private static projectObb(obb: OrientedBox, axis: Vec3): Projection {
        const axes = this.getObbAxes(obb);
        const center = new Vec3(obb.center.x, obb.center.y, obb.center.z);

        // 计算中心点在轴上的投影
        const centerProjection = this.dotProduct(center, axis);

        // 计算半长在轴上的投影
        let projectionRadius = 0;
        for (let i = 0; i < 3; i++) {
            const axisLength = this.getDimensionByIndex(obb.dimensions, i) / 2;
            const axisDot = Math.abs(this.dotProduct(axes[i], axis));
            projectionRadius += axisLength * axisDot;
        }

        return {
            min: centerProjection - projectionRadius,
            max: centerProjection + projectionRadius
        };
    }

    /**
     * 根据索引获取维度值
     */
    private static getDimensionByIndex(dim: Vector3, index: number): number {
        switch (index) {
            case 0: return dim.x; // 长
            case 1: return dim.y; // 高  
            case 2: return dim.z; // 宽
            default: return 0;
        }
    }

    // ========== 向量数学工具 ==========

    private static dotProduct(a: Vec3, b: Vec3): number {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }

    private static crossProduct(a: Vec3, b: Vec3): Vec3 {
        return new Vec3(
            a.y * b.z - a.z * b.y,
            a.z * b.x - a.x * b.z,
            a.x * b.y - a.y * b.x
        );
    }

    private static normalize(v: Vec3): Vec3 {
        const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (length === 0) return new Vec3(0, 0, 0);
        return new Vec3(v.x / length, v.y / length, v.z / length);
    }

    /**
     * 检测玩家准心是否指向OrientedBox（射线-OBB相交检测）
     * @param player 玩家实体
     * @param obb 定向包围盒
     * @param maxDistance 最大检测距离（默认64格）
     * @returns 是否相交
     */
    public static isPlayerLookingAtOBB(player: Player, obb: OrientedBox, maxDistance: number = 64): boolean {
        const eyePos = player.getHeadLocation();
        const viewDir = player.getViewDirection();

        const rayDir = new Vec3(viewDir.x, viewDir.y, viewDir.z);

        return this.rayIntersectsOBB(eyePos, rayDir, obb, maxDistance);
    }

    /**
     * 射线与OBB相交检测（Slab方法）
     */
    private static rayIntersectsOBB(origin: Vector3, direction: Vec3, obb: OrientedBox, maxDistance: number): boolean {
        const axes = this.getObbAxes(obb);
        const center = new Vec3(obb.center.x, obb.center.y, obb.center.z);
        const delta = new Vec3(origin.x - center.x, origin.y - center.y, origin.z - center.z);

        let tMin = 0;
        let tMax = maxDistance;

        // 对每个OBB轴进行slab测试
        for (let i = 0; i < 3; i++) {
            const axis = axes[i];
            const e = this.dotProduct(axis, delta);
            const f = this.dotProduct(axis, direction);
            const halfSize = this.getDimensionByIndex(obb.dimensions, i) / 2;

            if (Math.abs(f) > 1e-6) {
                let t1 = (-e - halfSize) / f;
                let t2 = (-e + halfSize) / f;

                if (t1 > t2) [t1, t2] = [t2, t1];

                tMin = Math.max(tMin, t1);
                tMax = Math.min(tMax, t2);

                if (tMin > tMax) return false;
            } else if (Math.abs(e) > halfSize) {
                return false;
            }
        }

        return tMax >= 0 && tMin <= maxDistance;
    }
}

export function rgbHexToColor(hex: number): RGBA {
    // 确保是32位整数
    const intValue = hex >>> 0;

    // 分别提取RGB分量
    const r = ((intValue >> 16) & 0xFF) / 255;
    const g = ((intValue >> 8) & 0xFF) / 255;
    const b = (intValue & 0xFF) / 255;

    return { red: r, green: g, blue: b, alpha: 1 };
}

export function GetPlayerById(id: string): Player | undefined {
    for (const element of world.getAllPlayers()) {
        if (element.id == id) {
            return element;
        }
    }

    return undefined;
}

// class EquitableMolang extends MolangVariableMap
// {
//     private molangVariableMap: MolangVariableMap;
//     private floatsvariables: EquitableMap<string, number | Vector3 | RGB> = new EquitableMap();

//     getMolang(): MolangVariableMap
//     {
//         return this.molangVariableMap;
//     }
// }
// 尝试优化MolangVariableMap，但是失败了

// Array.prototype.clearAndQuote = function<T>(this: T[]): T[] {
//     this.length = 0;
//     return this;
// }

export function currentTimeMillis(): number {
    return new Date().getTime()
}

export enum Dimensions {
    overworld = "overworld",
    nether = "nether",
    the_end = "the_end"
}

export const SIMULATION_CHUNK_SIZE: number = 4 // 4 个区块

export function isOutsideSimulationChunk_(playerPos: VectorXZ, pos: VectorXZ): boolean {
    const aChunkSize: number = SIMULATION_CHUNK_SIZE

    if (SIMULATION_CHUNK_SIZE == 4) {
        return Vec3.fromVector3(
            { x: playerPos.x, y: 0, z: playerPos.z }
        ).distanceTo(Vec3.fromVector3(
            { x: pos.x, y: 0, z: pos.z }
        )) < 44
    } else {
        return (Vec3.fromVector3(
            { x: playerPos.x, y: 0, z: playerPos.z }
        ).distanceTo(Vec3.fromVector3(
            { x: pos.x, y: 0, z: pos.z }
        )) < 128) && (Vec3.fromVector3(
            { x: playerPos.x, y: 0, z: playerPos.z }
        ).distManhattan(Vec3.fromVector3(
            { x: pos.x, y: 0, z: pos.z }
        )) <= (SIMULATION_CHUNK_SIZE - 1) * 16)
    }
}

/**
 * 判断(实体生成)的位置是否满足条件
 * 
 * @param playerPos 玩家位置
 * @param pos 判断位置
 * @returns 
 */
export function canSpawnEntity(playerPos: Vector3, pos: Vector3): boolean {
    return isOutsideSimulationChunk_(PosHelper.toVectorXZ(playerPos), PosHelper.toVectorXZ(pos))
}



/**
 * 此函数通过使用Ticker + runInterval实现模拟区块外放置实体(有延迟)，若还在模拟区块内，则直接放置
 * 此函数必须使用await
 * 
 * @remarks
 * 在指定位置创建一个新的实体（例如，一个生物）。
 * 
 * @param dimensionId
 * 生成在的维度
 * 
 * @param playerLocation 
 * 用于辅助判断是否在玩家的模拟区块外
 * 
 * @param identifier
 * 要生成的实体类型的标识符。如果未指定命名空间，则默认使用 'minecraft:'。
 * 
 * @param location 创建实体的位置。
 * 
 * @returns 在指定位置新创建的实体。
 */
export function mandatorySpawnEntity(dimensionId: string, playerLocation: Vector3, identifier: string | EntityType, location: Vector3, options?: SpawnEntityOptions): Promise<Entity> {
    const theDimension: Dimension = world.getDimension(dimensionId);

    return new Promise(async (resolve) => {
        let resultEntity: Entity | undefined = undefined

        try {
            resultEntity = theDimension.spawnEntity(identifier, location, options)
        } catch (error) {
        }

        if (resultEntity !== undefined) {
            resolve(resultEntity)
            return;
        }

        const ticker = TickerManager.getTicker(playerLocation, location);
        let index = 0;
        const intervalId = system.runInterval(() => {
            try {
                resultEntity = theDimension.spawnEntity(identifier, location, options)
            } catch (error) {
            }
            if (resultEntity !== undefined) {
                world.sendMessage(`§aOK!`)

                resolve(resultEntity)
                system.clearRun(intervalId) // 必须回收循环线程
                return;
            } else if (index >= 10) {
                console.error("Cannot mandatory spawn entity!")

                // resolve(undefined)
                system.clearRun(intervalId) // 必须回收循环线程
                return;
            } else {
                console.log(`Trys spawn count: ${index}`)
            }
            index++;
        }, 5)

        ticker.isUsing = false;
        await sleep(5);
    })
}

/**
 * 此函数通过使用runJob实现模拟区块外设置方块(有延迟)，若还在模拟区块内，则直接设置
 * 
 * @remarks
 * 在指定位置设置方块（例如，一个圆石）。
 * 
 * @param dimensionId
 * 生成在的维度
 * 
 * @param location
 * 设置方块的位置。
 * 
 * @param blockPermutation
 * 方块类型,状态
 * 
 * @returns 在指定位置新创建的实体。
 */
export function mandatorySetBlock(dimensionId: string, location: Vector3, blockPermutation: BlockPermutation): void {
    system.runJob(builder(dimensionId, location, blockPermutation))
    function* builder(dimensionId: string, location: Vector3, blockPermutation: BlockPermutation) {
        const theDimension: Dimension = world.getDimension(dimensionId);
        theDimension.setBlockPermutation({ x: Math.floor(location.x), y: Math.floor(location.y), z: Math.floor(location.z) }, blockPermutation)
    }
}

interface Ticker {
    readonly entity: Entity;
    isUsing: boolean;
}

export class TickerManager {
    private static tickers: Ticker[] = [];

    static getTicker(playerPos: Vector3, pos: Vector3): Ticker {
        // 尝试取现有Ticker，用于防止多次产生新Ticker
        if (this.tickers.length > 0) {
            for (let index = 0; index < this.tickers.length; index++) {
                const ticker = this.tickers[index];

                if (!ticker.isUsing && ticker.entity) {
                    ticker.entity.teleport(pos);
                    ticker.isUsing = true;
                    return ticker;

                } else if (!ticker.entity) {
                    if (ticker.isUsing) console.log("Ticker is using but entity is undefined");
                    // 清理无效Ticker
                    this.tickers.splice(index, 1);
                }
            }
        }

        // 创建新Ticker
        const tickerEntity = world.getDimension("overworld").spawnEntity("mts:ticker", playerPos);
        const newTicker: Ticker = {
            entity: tickerEntity,
            isUsing: true
        };
        newTicker.entity.teleport(pos);
        this.tickers.push(newTicker);
        return newTicker;
    }

    static removeAllTickers() {
        this.tickers.forEach((ticker) => {
            if (!ticker.isUsing) {
                ticker.entity.remove();
            }
        });
        this.tickers.length = 0;
    }
}

const sleep = (time: number) => new Promise((r) => system.runTimeout((r as () => void), time));

// function* spawnEntity(dimension: DimensionType, playerLocation: Vector3, identifier: string | EntityType, location: Vector3, options?: SpawnEntityOptions) {
//     return world.getDimension(dimension).spawnEntity(identifier, location, options)
// }


export function getNearestPlayer(location: Vector3): Player | null {
    const players = world.getAllPlayers();
    let nearestPlayer: Player | null = null;
    let minDist: number = Infinity;

    for (const player of players) {
        const playerPos = player.location
        const dx = location.x - playerPos.x;
        const dy = location.y - playerPos.y;
        const dz = location.z - playerPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < minDist) {
            minDist = dist;
            nearestPlayer = player;
        }
    }

    return nearestPlayer;
}




class ThreadManager {
    public readonly threads: Map<number, { sleepTick: number, currentTick: number }> = new Map(); // <SAPI Thread, sleepTick>
    private static EMPTY_CALLBACK: () => void = () => { }

    constructor() {
    }

    sleepTicks(tick: number): Promise<void> {
        if (tick != Math.floor(tick) || tick < 1)
            throw new Error()

        return new Promise(async (resolve) => {
            let currentTick = 1

            const threadId = system.runInterval(() => {
                if (currentTick == tick) {
                    resolve()
                    system.clearRun(threadId)
                    return;
                }

                currentTick++;
            }, 1)
        })
    }

    update() {
        for (const [threadId, struct] of this.threads) {
            if (struct.currentTick == struct.sleepTick) {
                system.clearRun(threadId)
            }

            struct.currentTick++;
        }
    }
}

const gThreadManager = new ThreadManager()


export function getBlockDisplayName(blockPermutation: BlockPermutation): RawMessage {
    let blockId = blockPermutation.type.id;
    let translationKey = 'tile.' + blockId.replace(/^minecraft:/, '') + '.name';

    // 显示本地化名称
    return {
        rawtext: [{
            translate: translationKey
        }]
    };
}
