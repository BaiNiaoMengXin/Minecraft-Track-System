import { BlockPos } from "util/math/BlockPos";
import { BetterMap } from "./BetterMap";
import { RailwayData } from "./RailwayData";
import { RailwayDataModuleBase } from "./RailwayDataModuleBase";
import { Rail } from "./Rail";
import { Player, world } from "@minecraft/server";

export class RailwayDataCoolDownModule extends RailwayDataModuleBase {

	// private readonly playerRidingCoolDown: BetterMap<Player, number> = new BetterMap();
	public readonly playerShiftCoolDowns: BetterMap<Player, [number, number]>  = new BetterMap();

	public static readonly SHIFT_ACTIVATE_TICKS = 13;

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
		this.playerShiftCoolDowns.forEach((entry, player) => {
			const oldCoolDown = entry[0];
			if (oldCoolDown == 1) {
				entry[1] = 0;
			}

			if (oldCoolDown != 0) {
				entry[0] = oldCoolDown - 1;
			}
		})


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
		this.playerShiftCoolDowns.set(player, [0, 0]);
	}

	public onPlayerDisconnect(player: Player): void {
		this.playerShiftCoolDowns.delete(player);
	}

	public onPlayerLeaveRideable(player: Player) {
		if (!this.playerShiftCoolDowns.has(player)) {
			this.playerShiftCoolDowns.set(player, [0, 0]);
		}

		const oldValue = this.playerShiftCoolDowns.get(player)!;
		oldValue[0] = RailwayDataCoolDownModule.SHIFT_ACTIVATE_TICKS;
		oldValue[1] = oldValue[1] + 1;
	}

	public updatePlayerRiding(player: Player, routeId: number): void {
		const isRiding = routeId != 0;
		// if (isRiding) {
		// 	this.playerRidingCoolDown.set(player, 2);
		// }
	}

	public shouldDismount(player: Player): boolean {
		const entry = this.playerShiftCoolDowns.get(player);
		return entry != undefined && entry[1] == 3;
	}

	public canRide(player: Player): boolean {
		// return !this.playerRidingCoolDown.has(player);
		return true;
	}
}
