import { Block, BlockComponentTypes, BlockPermutation, GameMode, ItemComponentUseOnEvent, Player } from "@minecraft/server";
import { BlockPos } from "util/math/BlockPos";
import { Direction } from "util/math/Direction";
import { ItemBase } from "./ItemBase";
import { IBlock } from "block/IBlock";

export namespace ItemPSDAPGBase {

	export function blocksNotReplaceable(event: ItemComponentUseOnEvent, width: number, height: number, blacklistPermutaion: BlockPermutation | undefined) {
		const dimension = event.block.dimension;
		const facing = Direction.fromYRot(event.source.getRotation().y);
		const startingPos = new BlockPos(event.block.location).relative(Direction.valueOf(event.blockFace, false)!);

		for (let x = 0; x < width; x++) {
			const offsetPos = startingPos.relative(facing.getClockWise(), x);

			if (blacklistPermutaion != undefined) {
				const isBlacklistedBelow = dimension.getBlock(offsetPos.below().asJson())?.typeId == blacklistPermutaion.type.id;
				const isBlacklistedAbove = dimension.getBlock(offsetPos.above(height).asJson())?.typeId == blacklistPermutaion.type.id;
				if (isBlacklistedBelow || isBlacklistedAbove) {
					return true;
				}
			}

			for (let y = 0; y < height; y++) {
				if (!dimension.getBlock(offsetPos.above(y).asJson())?.isAir) {
					return true;
				}
			}
		}

		return false;
	}
}
