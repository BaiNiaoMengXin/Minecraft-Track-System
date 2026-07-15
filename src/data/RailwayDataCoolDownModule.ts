import { BlockPos } from "util/math/BlockPos";
import { BetterMap } from "./BetterMap";
import { RailwayData } from "./RailwayData";
import { RailwayDataModuleBase } from "./RailwayDataModuleBase";
import { Rail } from "./Rail";
import { Player, world } from "@minecraft/server";

export class RailwayDataCoolDownModule extends RailwayDataModuleBase {

	// private readonly playerRidingCoolDown: BetterMap<Player, number> = new BetterMap();
	// private readonly playerShiftCoolDowns: BetterMap<Player, number>  = new BetterMap();

	public static readonly SHIFT_ACTIVATE_TICKS = 30;

	public constructor(railwayData: RailwayData, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>) {
		super(railwayData, rails);

		world.afterEvents.playerJoin.subscribe(event => {
			this.onPlayerJoin(world.getEntity(event.playerId) as Player);
		});
		world.beforeEvents.playerLeave.subscribe(evemt => {
			this.onPlayerDisconnect(evemt.player);
		})
	}

	public tick(): void {
		// world.getAllPlayers().forEach(player => {
		// 	const oldShiftCoolDown = this.playerShiftCoolDowns.get(player) ?? 0;
		// 	let shiftCoolDown: number;
		// 	if (playerShiftDown(player)) {
		// 		shiftCoolDown = Math.min(RailwayDataCoolDownModule.SHIFT_ACTIVATE_TICKS, oldShiftCoolDown + 1);
		// 	} else {
		// 		shiftCoolDown = 0;
		// 	}
		// 	if (shiftCoolDown != oldShiftCoolDown) {
		// 		this.playerShiftCoolDowns.set(player, shiftCoolDown);
		// 	}
		// });


		// const playersToRemove = new Set<Player>();
		// this.playerRidingCoolDown.forEach((coolDown, player) => {
		// 	if (coolDown <= 0) {
		// 		playersToRemove.add(player);
		// 	}
		// 	this.playerRidingCoolDown.set(player, coolDown - 1);
		// });
		// playersToRemove.forEach(player => {
		// 	this.playerRidingCoolDown.delete(player);
		// });
	}

	public onPlayerJoin(player: Player): void {
		// this.playerRidingCoolDown.set(player, 2);
		// this.playerShiftCoolDowns.set(player, 0);
	}

	public onPlayerDisconnect(player: Player): void {
		// this.playerShiftCoolDowns.delete(player);
	}

	public updatePlayerRiding(player: Player, routeId: number): void {
		const isRiding = routeId != 0;
		// if (isRiding) {
		// 	this.playerRidingCoolDown.set(player, 2);
		// }
	}

	public shouldDismount(player: Player): boolean {
		// return (this.playerShiftCoolDowns.get(player) ?? 0) == RailwayDataCoolDownModule.SHIFT_ACTIVATE_TICKS;
		return false;
	}

	public canRide(player: Player): boolean {
		// return !this.playerRidingCoolDown.has(player);
		return true;
	}
}
