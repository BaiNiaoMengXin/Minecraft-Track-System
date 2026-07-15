import { ItemStack, Player } from "@minecraft/server";
import { ItemNodeModifierSelectableBlockBase } from "./ItemNodeModifierSelectableBlockBase";
import { BlockPos } from "util/math/BlockPos";
import { MTS } from "MTS";

export class ItemTunnelCreator extends ItemNodeModifierSelectableBlockBase {

	public constructor(height: number, width: number) {
		super(false, height, width);
	}

	protected override onConnect2(player: Player, stack: ItemStack, posStart: BlockPos, posEnd: BlockPos, radius: number, height: number): boolean {
		return MTS.railwayData.railwayDataRailActionsModule.markRailForTunnel(player, posStart, posEnd, radius, height);
	}
}
