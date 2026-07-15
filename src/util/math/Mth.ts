
export namespace Mth {
    /** 数学常量 */
    export const PI: number = Math.PI;
    export const TWO_PI: number = Math.PI * 2;
    export const HALF_PI: number = Math.PI / 2;
    export const DEG_TO_RAD: number = Math.PI / 180;
    export const RAD_TO_DEG: number = 180 / Math.PI;
    export const EPSILON: number = 1e-6;

    // ========== 基本数学运算 ==========
    
    /**
     * 绝对值
     */
    export function abs(value: number): number {
        return Math.abs(value);
    }

    /**
     * 最大值
     */
    export function max(a: number, b: number): number;
    export function max(...values: number[]): number;
    export function max(a: number, b?: number, ...rest: number[]): number {
        if (b === undefined) return a;
        if (rest.length === 0) return Math.max(a, b);
        return Math.max(a, b, ...rest);
    }

    /**
     * 最小值
     */
    export function min(a: number, b: number): number;
    export function min(...values: number[]): number;
    export function min(a: number, b?: number, ...rest: number[]): number {
        if (b === undefined) return a;
        if (rest.length === 0) return Math.min(a, b);
        return Math.min(a, b, ...rest);
    }

    /**
     * 平方根
     */
    export function sqrt(value: number): number {
        return Math.sqrt(value);
    }

    /**
     * 幂运算
     */
    export function pow(base: number, exponent: number): number {
        return Math.pow(base, exponent);
    }

    // ========== 范围限制和插值 ==========
    
    /**
     * 限制值在最小最大值之间
     */
    export function clamp(value: number, min: number, max: number): number {
        return value < min ? min : value > max ? max : value;
    }

    /**
     * 线性插值
     */
    export function lerp(start: number, end: number, factor: number): number {
        return start + (end - start) * factor;
    }

    /**
     * 反线性插值（计算因子）
     */
    export function inverseLerp(start: number, end: number, value: number): number {
        return end !== start ? (value - start) / (end - start) : 0;
    }

    /**
     * 平滑插值（使用平滑函数）
     */
    export function smoothLerp(start: number, end: number, factor: number): number {
        // 使用平滑步函数
        const smoothFactor = factor * factor * (3 - 2 * factor);
        return lerp(start, end, smoothFactor);
    }

    // ========== 角度和弧度转换 ==========
    
    /**
     * 角度转弧度
     */
    export function toRadians(degrees: number): number {
        return degrees * DEG_TO_RAD;
    }

    /**
     * 弧度转角度
     */
    export function toDegrees(radians: number): number {
        return radians * RAD_TO_DEG;
    }

    /**
     * 标准化角度到0-360范围
     */
    export function wrapDegrees(degrees: number): number {
        let normalized = degrees % 360;
        if (normalized < 0) normalized += 360;
        return normalized;
    }

    /**
     * 标准化角度到-180到180范围
     */
    export function wrapDegrees180(degrees: number): number {
        let normalized = degrees % 360;
        if (normalized > 180) normalized -= 360;
        else if (normalized <= -180) normalized += 360;
        return normalized;
    }

    // ========== 舍入运算 ==========
    
    /**
     * 向下取整
     */
    export function floor(value: number): number {
        return Math.floor(value);
    }

    /**
     * 向上取整
     */
    export function ceil(value: number): number {
        return Math.ceil(value);
    }

    /**
     * 四舍五入
     */
    export function round(value: number): number {
        return Math.round(value);
    }

    /**
     * 向零取整
     */
    export function trunc(value: number): number {
        return Math.trunc(value);
    }

    /**
     * 游戏常用的快速取整（性能优化）
     */
    export function fastFloor(value: number): number {
        return value > 0 ? value | 0 : (value - 1) | 0;
    }

    // ========== 三角函数 ==========
    
    /**
     * 正弦（接受弧度）
     */
    export function sin(radians: number): number {
        return Math.sin(radians);
    }

    /**
     * 余弦（接受弧度）
     */
    export function cos(radians: number): number {
        return Math.cos(radians);
    }

    /**
     * 正切（接受弧度）
     */
    export function tan(radians: number): number {
        return Math.tan(radians);
    }

    /**
     * 反正弦（返回弧度）
     */
    export function asin(value: number): number {
        return Math.asin(value);
    }

    /**
     * 反余弦（返回弧度）
     */
    export function acos(value: number): number {
        return Math.acos(value);
    }

    /**
     * 反正切（返回弧度）
     */
    export function atan(value: number): number {
        return Math.atan(value);
    }

    /**
     * 反正切2（返回弧度，考虑象限）
     */
    export function atan2(y: number, x: number): number {
        return Math.atan2(y, x);
    }

    // ========== 随机数 ==========
    
    /**
     * 随机浮点数 [0, 1)
     */
    export function random(): number {
        return Math.random();
    }

    /**
     * 随机整数 [min, max]
     */
    export function randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 随机浮点数 [min, max)
     */
    export function randomFloat(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    // ========== 游戏专用数学 ==========
    
    /**
     * 计算两点间距离
     */
    export function distance(x1: number, y1: number, x2: number, y2: number): number;
    export function distance(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number;
    export function distance(...args: number[]): number {
        if (args.length === 4) {
            const [x1, y1, x2, y2] = args;
            return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        } else {
            const [x1, y1, z1, x2, y2, z2] = args;
            return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
        }
    }

    /**
     * 曼哈顿距离
     */
    export function manhattanDistance(x1: number, y1: number, x2: number, y2: number): number;
    export function manhattanDistance(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number;
    export function manhattanDistance(...args: number[]): number {
        if (args.length === 4) {
            const [x1, y1, x2, y2] = args;
            return Math.abs(x2 - x1) + Math.abs(y2 - y1);
        } else {
            const [x1, y1, z1, x2, y2, z2] = args;
            return Math.abs(x2 - x1) + Math.abs(y2 - y1) + Math.abs(z2 - z1);
        }
    }

    /**
     * 数值近似相等（考虑浮点误差）
     */
    export function approximately(a: number, b: number, epsilon: number = EPSILON): boolean {
        return Math.abs(a - b) < epsilon;
    }

    /**
     * 符号函数
     */
    export function sign(value: number): number {
        return value > 0 ? 1 : value < 0 ? -1 : 0;
    }

    /**
     * 将值映射到新范围
     */
    export function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
        return outMin + (outMax - outMin) * inverseLerp(inMin, inMax, value);
    }

    export function frac(f: number): number {
        return f - Math.floor(f);
    }
}


