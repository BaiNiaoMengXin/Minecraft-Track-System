import { EntityComponentTypes, ItemStack, Player } from "@minecraft/server";
import { BlockPos } from "util/math/BlockPos";
import { ItemNodeModifierSelectableBlockBase } from "./ItemNodeModifierSelectableBlockBase";
import { MTS } from "MTS";

export class ItemTunnelWallCreator extends ItemNodeModifierSelectableBlockBase {

	public constructor(height: number, width: number) {
		super(true, height, width);
	}

	protected override onConnect2(player: Player, stack: ItemStack, posStart: BlockPos, posEnd: BlockPos, radius: number, height: number): boolean {
		const permutation = this.getSavedPermutation(stack);
		return MTS.railwayData.railwayDataRailActionsModule.markRailForTunnelWall(player, posStart, posEnd, radius, height, permutation);
	}
}
