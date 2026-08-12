import { Block, BlockPermutation, PlayerBreakBlockBeforeEvent, system, world } from "@minecraft/server";
import { BlockEscalatorBase } from "./BlockEscalatorBase";
import { IBlock } from "./IBlock";
import { BlockPos } from "util/math/BlockPos";
import { Direction } from "util/math/Direction";
import { NeighborShapeUpdatingBlock } from "./NeighborShapeUpdatingBlock";

export class BlockEscalatorSide extends BlockEscalatorBase {

	public override updateShape(block: Block, direction: Direction, neighborBlock: Block): BlockPermutation {
		if (direction == Direction.DOWN && block.below()?.typeId != "mts:escalator_step") {
			return BlockPermutation.resolve("minecraft:air");
		} else {
			return super.updateShape(block, direction, neighborBlock);
		}
	}

	public override playerWillDestroy(event: PlayerBreakBlockBeforeEvent): void {
		let offsetPos = new BlockPos(event.block.location).below();
		const permutation = event.block.permutation;

		if (permutation.getState(IBlock.STATE_SIDE as any) as IBlock.EnumSide == IBlock.EnumSide.RIGHT) {
			offsetPos = offsetPos.relative(IBlock.getSideDirection(permutation));
		}
		system.run(() => {
			NeighborShapeUpdatingBlock.setBlockAndUpdateShape(new BlockPos(event.block.location).relative(IBlock.getSideDirection(permutation)).asJson(), BlockPermutation.resolve("minecraft:air"));
			NeighborShapeUpdatingBlock.updateNeighborBlocks(event.block);
		});
	}
}
