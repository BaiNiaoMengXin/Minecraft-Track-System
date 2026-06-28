import { Mth } from 'util/math/Mth';

export namespace TrigCache {

	const INCREMENT = 0.01;
	export const ASIN_TABLE = new Array<number>(~~(2 / INCREMENT) + 1);

	export function asin(value: number): number {
		return ASIN_TABLE[Mth.clamp(Math.round(value / INCREMENT) + 100, 0, ASIN_TABLE.length - 1)];
	}

	(() => {
    	let j = -1;
        for (let i = 0; i < ASIN_TABLE.length; i++) {
            ASIN_TABLE[i] = Math.asin(Math.min(j, 1));// Preventing "j" from exceeding 1 due to double precision, which does not conform to the expected behavior of float.
            j += INCREMENT;
        }
    })()
}