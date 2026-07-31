import { ArrayList } from "jLib/ArrayList";
import { RailwayDataModuleBase } from "./RailwayDataModuleBase";
import { Rail, RailActions, RailActionType } from "./Rail";
import { RailwayData } from "./RailwayData";
import { BlockPos } from "util/math/BlockPos";
import { BetterMap } from "./BetterMap";
import { BlockPermutation, Player } from "@minecraft/server";

export class RailwayDataRailActionsModule extends RailwayDataModuleBase {

	public readonly railActions: ArrayList<RailActions> = new ArrayList();

	public constructor(railwayData: RailwayData, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>) {
		super(railwayData, rails);
	}

	public tick(): void {
		if (!this.railActions.isEmpty() && this.railActions[0].build()) {
			this.railActions.remove(0);
		}
	}

	public markRailForBridge(player: Player, pos1: BlockPos, pos2: BlockPos, radius: number, permutation: BlockPermutation): boolean {
		if (this.railwayData.containsRail(pos1, pos2)) {
			this.railActions.push(new RailActions(player, RailActionType.BRIDGE, this.rails.get(pos1)!.get(pos2)!, radius, 0, permutation));
			return true;
		} else {
			return false;
		}
	}

	public markRailForTunnel(player: Player, pos1: BlockPos, pos2: BlockPos, radius: number, height: number): boolean {
		if (this.railwayData.containsRail(pos1, pos2)) {
			this.railActions.push(new RailActions(player, RailActionType.TUNNEL, this.rails.get(pos1)!.get(pos2)!, radius, height, undefined!));
			return true;
		} else {
			return false;
		}
	}

	public markRailForTunnelWall(player: Player, pos1: BlockPos, pos2: BlockPos, radius: number, height: number, permutation: BlockPermutation): boolean {
		if (this.railwayData.containsRail(pos1, pos2)) {
			this.railActions.push(new RailActions(player, RailActionType.TUNNEL_WALL, this.rails.get(pos1)!.get(pos2)!, radius + 1, height + 1, permutation));
			return true;
		} else {
			return false;
		}
	}

	public removeRailAction(id: number): void {
		this.railActions.removeIf(railAction => railAction.id == id);
	}
}
