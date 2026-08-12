import { Block, BlockPermutation, PlayerBreakBlockBeforeEvent, PlayerInteractWithBlockBeforeEvent, PlayerPlaceBlockAfterEvent } from "@minecraft/server";
import { ItemPSDAPGBase } from "item/ItemPSDAPGBase";
import { IBlock } from "./IBlock";
import { Direction } from "util/math/Direction";
import { BlockPos } from "util/math/BlockPos";
import { BlockBase } from "./BlockBase";
import { NeighborShapeUpdatingBlock } from "./NeighborShapeUpdatingBlock";

export enum EnumEscalatorOrientation {

	LANDING_BOTTOM = "landing_bottom",
	LANDING_TOP = "landing_top",
	FLAT = "flat",
	SLOPE = "slope",
	TRANSITION_BOTTOM = "transition_bottom",
	TRANSITION_TOP = "transition_top"
}

export abstract class BlockEscalatorBase extends NeighborShapeUpdatingBlock {

	/** EnumEscalatorOrientation */
	public static readonly STATE_ORIENTATION = "mts:orientation";

	public override updateShape(block: Block, direction: Direction, neighborBlock: Block): BlockPermutation {		
		const permutation = block.permutation;
		if (IBlock.getSideDirection(permutation) == direction && neighborBlock.typeId != block.typeId) {
			return BlockPermutation.resolve("minecraft:air");
		} else {
			return permutation.withState(BlockEscalatorBase.STATE_ORIENTATION as any, BlockEscalatorBase.getOrientation(block));
		}
	}

	protected static getOrientation(block: Block): EnumEscalatorOrientation {
		const permutation = block.permutation;
		const dimension = block.dimension;

		const pos = new BlockPos(block.location);
		const facing = Direction.valueOf(permutation.getState(IBlock.STATE_FACING as any) as string);

		const posAhead = pos.relative(facing!);
		const posBehind = pos.relative(facing!, -1);

		const isAhead = block.typeId == dimension.getBlock(posAhead.asJson())!.typeId;
		const isAheadUp = block.typeId == dimension.getBlock(posAhead.above().asJson())!.typeId;

		const isBehind = block.typeId == dimension.getBlock(posBehind.asJson())!.typeId;
		const isBehindDown = block.typeId == dimension.getBlock(posBehind.below().asJson())!.typeId;

		if (isAhead && isBehind) {
			return EnumEscalatorOrientation.FLAT;
		} else if (isAheadUp && isBehindDown) {
			return EnumEscalatorOrientation.SLOPE;
		} else if (isAheadUp && isBehind) {
			return EnumEscalatorOrientation.TRANSITION_BOTTOM;
		} else if (isAhead && isBehindDown) {
			return EnumEscalatorOrientation.TRANSITION_TOP;
		} else if (isBehind) {
			return EnumEscalatorOrientation.LANDING_TOP;
		} else {
			return EnumEscalatorOrientation.LANDING_BOTTOM;
		}
	}
}
