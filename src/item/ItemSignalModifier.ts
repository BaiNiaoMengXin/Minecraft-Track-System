import { DyeColor } from "util/DyeColor";
import { ItemNodeModifierBase } from "./ItemNodeModifierBase";
import { TransportMode } from "data/TransportMode";
import { BlockPermutation, Player } from "@minecraft/server";
import { BlockPos } from "util/math/BlockPos";
import { RailAngle } from "data/RailAngle";
import { MTS } from "MTS";

export class ItemSignalModifier extends ItemNodeModifierBase {

	private readonly color: DyeColor;

	public constructor(isConnector: boolean, color: DyeColor) {
		super(true, false, true, isConnector);
		this.color = color;
	}

	protected override onConnect(transportMode: TransportMode, permutationStart: BlockPermutation, permutationEnd: BlockPermutation, posStart: BlockPos, posEnd: BlockPos, facingStart: RailAngle, facingEnd: RailAngle, player: Player): void {
		if (MTS.railwayData.containsRail(posStart, posEnd)) {
			MTS.railwayData.addSignal(player, this.color, posStart, posEnd);
		} else {
			player.onScreenDisplay.setActionBar({ translate: "gui.mts.rail_not_found" });
		}
	}

	protected override onRemove(posStart: BlockPos, posEnd: BlockPos, player: Player): void {
		MTS.railwayData.removeSignal(player, this.color, posStart, posEnd);
	}
}
