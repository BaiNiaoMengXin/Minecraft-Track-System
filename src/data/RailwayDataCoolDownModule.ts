import { BlockPos } from "util/math/BlockPos";
import { BetterMap } from "./BetterMap";
import { RailwayData } from "./RailwayData";
import { RailwayDataModuleBase } from "./RailwayDataModuleBase";
import { Rail } from "./Rail";
import { EntityComponentTypes, Player, world } from "@minecraft/server";
import { Route } from "./Route";
import { MTS } from "MTS";

export class RailwayDataCoolDownModule extends RailwayDataModuleBase {

// ifdef @BDSOnly
	private readonly playerRidingCoolDown: BetterMap<Player, number> = new BetterMap();
	private readonly playerRidingRoute: BetterMap<Player, number> = new BetterMap();
// endif

	public readonly playerShiftCoolDowns: BetterMap<Player, [number, number]>  = new BetterMap();
	private readonly playerInteractCoolDowns: BetterMap<Player, number> = new BetterMap();

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

		this.playerInteractCoolDowns.forEach((value, player) => {
			if (value == 0) {
				this.playerInteractCoolDowns.delete(player);
			} else {
				this.playerInteractCoolDowns.set(player, value - 1);
			}
		});

// ifdef @BDSOnly
		const playersToRemove = new Set<Player>();
		this.playerRidingCoolDown.forEach((coolDown, player) => {
			if (coolDown <= 0) {
				// this.updatePlayerRiding(player, 0)
				playersToRemove.add(player);
				player.getComponent(EntityComponentTypes.Riding)?.entityRidingOn.remove();
			}
			this.playerRidingCoolDown.set(player, coolDown - 1);
		});
		playersToRemove.forEach(player => {
			this.playerRidingCoolDown.delete(player);
			this.playerRidingRoute.delete(player);
		});
// endif
	}

	public onPlayerJoin(player: Player): void {
		this.playerRidingCoolDown.set(player, 2);
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
		if (routeId != 0) {
			this.playerRidingCoolDown.set(player, 2);
			this.playerRidingRoute.set(player, routeId);
		}
	}

	public shouldDismount(player: Player): boolean {
		const entry = this.playerShiftCoolDowns.get(player);
		return entry != undefined && entry[1] == 3;
	}

	public canRide(player: Player): boolean {
		return !this.playerRidingCoolDown.has(player);
	}

	public getRidingRoute(player: Player): Route | undefined {
		const id = this.playerRidingRoute.get(player);
		if (id != undefined) {
			return MTS.railwayData.dataCache.routeIdMap.get(id)!;
		} else {
			return undefined;
		}
	}

	public onPlayerWillInteract(player: Player): void {
		this.playerInteractCoolDowns.set(player, 2);
	}

	public canInteract(player: Player): boolean {
		return !this.playerInteractCoolDowns.has(player);
	}
}
