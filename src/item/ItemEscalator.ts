import { BlockPermutation, EntityComponentTypes, GameMode, ItemComponentUseOnEvent, Player } from "@minecraft/server";
import { ItemBase } from "./ItemBase";
import { ItemPSDAPGBase } from "./ItemPSDAPGBase";
import { BlockPos } from "util/math/BlockPos";
import { Direction } from "util/math/Direction";
import { MTS } from "MTS";
import { BlockEscalatorBase } from "block/BlockEscalatorBase";
import { BlockEscalatorStep } from "block/BlockEscalatorStep";
import { IBlock } from "block/IBlock";
import { NeighborShapeUpdatingBlock } from "block/NeighborShapeUpdatingBlock";

export class ItemEscalator extends ItemBase {

	public override useOn(event: ItemComponentUseOnEvent): void {
		if (ItemPSDAPGBase.blocksNotReplaceable(event, 2, 2, undefined)) {
			return;
		}
		const dimension = event.source.dimension;
        const clickedFace = event.blockFace;
		let pos1 = new BlockPos(event.block.location).relative(Direction.valueOf(clickedFace, false)!);
		let playerFacing = Direction.fromYRot(event.source.getRotation().y);
		let pos2 = pos1.relative(playerFacing.getClockWise());

		const frontBlock = dimension.getBlock(pos1.relative(playerFacing).asJson());
		if (frontBlock?.typeId.startsWith("mts:escalator_")) {
			if (frontBlock.permutation.getState(IBlock.STATE_FACING as any) == playerFacing.getOpposite().getId()) {
				playerFacing = playerFacing.getOpposite();
				const pos3 = pos1;
				pos1 = pos2;
				pos2 = pos3;
			}
		}
		
		const stepPermutation = BlockPermutation.resolve("mts:escalator_step", { [IBlock.STATE_FACING]: playerFacing.getId() });
		NeighborShapeUpdatingBlock.setBlockAndUpdateShape(pos1.asJson(), stepPermutation.withState(IBlock.STATE_SIDE as any, IBlock.EnumSide.LEFT));
		NeighborShapeUpdatingBlock.setBlockAndUpdateShape(pos2.asJson(), stepPermutation.withState(IBlock.STATE_SIDE as any, IBlock.EnumSide.RIGHT));

		const sidePermutation = BlockPermutation.resolve("mts:escalator_side", { [IBlock.STATE_FACING]: playerFacing.getId() });
		NeighborShapeUpdatingBlock.setBlockAndUpdateShape(pos1.above().asJson(), sidePermutation.withState(IBlock.STATE_SIDE as any, IBlock.EnumSide.LEFT));
		NeighborShapeUpdatingBlock.setBlockAndUpdateShape(pos2.above().asJson(), sidePermutation.withState(IBlock.STATE_SIDE as any, IBlock.EnumSide.RIGHT));

		const plaeyr = (event.source as Player);
		if (plaeyr.getGameMode() != GameMode.Creative) {
			if (event.itemStack.amount == 1) {
				plaeyr.getComponent(EntityComponentTypes.Inventory)?.container.setItem(plaeyr.selectedSlotIndex);
			} else {
				event.itemStack.amount--;
			}
		}
	}
}
