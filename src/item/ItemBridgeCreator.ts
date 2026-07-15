import { ItemStack, Player } from "@minecraft/server";
import { BlockPos } from "util/math/BlockPos";
import { ItemNodeModifierSelectableBlockBase } from "./ItemNodeModifierSelectableBlockBase";
import { MTS } from "MTS";

export class ItemBridgeCreator extends ItemNodeModifierSelectableBlockBase {

	public constructor(width: number) {
		super(true, 0, width);
	}

	protected override onConnect2(player: Player, stack: ItemStack, posStart: BlockPos, posEnd: BlockPos, radius: number, height: number): boolean {
		const permutation = this.getSavedPermutation(stack);
		return MTS.railwayData.railwayDataRailActionsModule.markRailForBridge(player, posStart, posEnd, radius, permutation);
	}
}
