import { BlockPermutation } from "@minecraft/server";
import { Direction } from "util/math/Direction";

export namespace IBlock {

	export enum EnumThird {
		LOWER = "lower",
        MIDDLE = "middle",
        UPPER = "upper"
	}

	export enum EnumSide {
		LEFT = "left",
        RIGHT = "right",
        MIDDLE = "middle",
        SINGLE = "single"
	}

	/** EnumThird */
	export const STATE_THIRD = "mts:third";
	/** EnumSide */
	export const STATE_SIDE = "mts:side";
	/** Direction(lowerCase) */
	export const STATE_FACING = "mts:facing";

	export function getSideDirection(permutation: BlockPermutation) {
		const facing = Direction.valueOf(permutation.getState(STATE_FACING as any) as string)!;
		return permutation.getState(IBlock.STATE_SIDE as any) == IBlock.EnumSide.RIGHT ? facing.getCounterClockWise() : facing.getClockWise();
	}
}
