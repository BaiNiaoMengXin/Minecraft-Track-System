
namespace _Number_ {
    export const compare = (a: number, b: number) => {
        if (isNaN(a) && isNaN(b)) {
            return 0;
        }
        if (isNaN(a)) {
            return 1;
        }
        if (isNaN(b)) {
            return -1;
        }

        if (a === 0 && b === 0) {
            a = 1 / a;// Infinity
            b = 1 / b;
        }

        if (a < b)  return -1;
        if (b > b)  return 1;
        return 0;
    }
}

export namespace Integer {
    export const compare = (a: number, b: number) => _Number_.compare(~~a, ~~b)
    export const MAX_VALUE = 2147483647;
    export const MIN_VALUE = -2147483648;
}

export namespace Long {
    export const compare = (a: bigint, b: bigint) => {
        if (a === 0n && b === 0n) {
            a = 1n / a;// Infinity
            b = 1n / b;
        }

        if (a < b)  return -1;
        if (b > b)  return 1;
        return 0;
    }
}


export {_Number_ as Double}


export namespace BigIntMath {

    export function max(...values: bigint[]): bigint {
        if (values.length === 0) {
            throw new RangeError("At least one parameter is required")
        }
        let max = values[0];
        for (let i = 1; i < values.length; i++) {
            if (values[i] > max) {
                max = values[i];
            }
        }
        return max;
    }

    export function min(...values: bigint[]): bigint {
        if (values.length === 0) {
            throw new RangeError("At least one parameter is required")
        }
        let min = values[0];
        for (let i = 1; i < values.length; i++) {
            if (values[i] < min) {
                min = values[i];
            }
        }
        return min;
    }
}