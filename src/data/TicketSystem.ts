import { GameMode, Player, Vector3, world } from "@minecraft/server";
import { RailwayData } from "data/RailwayData";
import { Station } from "data/Station";
import { MTS } from "MTS";
import { BlockPos } from "util/math/BlockPos";

interface ScoreCallback {
	getScore: () => number,
	setScore: (v: number) => void,
	add: (v: number) => void
}

export class TicketSystem {

	public static readonly BALANCE_OBJECTIVE = "mts_balance";
	private static readonly ENTRY_ZONE_OBJECTIVE = "mts_entry_zone";
	private static readonly BASE_FARE = 2;
	private static readonly ZONE_FARE = 1;
	private static readonly EVASION_FINE = 500;

	public static passThrough(pos: Vector3, player: Player, isEntrance: boolean, isExit: boolean, entrySound: string, entrySoundConcessionary: string, exitSound: string, exitSoundConcessionary: string, failSound: string, remindIfNoRecord: boolean) {
		const railwayData = MTS.railwayData;

		const station = RailwayData.getStation(railwayData.stations, new BlockPos(pos));
		if (station == null) {
			return TicketSystem.EnumTicketBarrierOpen.CLOSED;
		}

		this.addObjectivesIfMissing();

		const balanceScore = this.getPlayerScore(player, this.BALANCE_OBJECTIVE);
		const entryZoneScore = this.getPlayerScore(player, this.ENTRY_ZONE_OBJECTIVE);

		if (balanceScore == undefined || entryZoneScore == undefined) {
			return;
		}

		let isEntering: boolean;
		if (isEntrance && isExit) {
			isEntering = entryZoneScore.getScore() == 0;
		} else {
			isEntering = isEntrance;
		}

		let canOpen: boolean;
		if (isEntering) {
			canOpen = this.onEnter(station, player, balanceScore, entryZoneScore, remindIfNoRecord);
		} else {
			canOpen = this.onExit(station, player, balanceScore, entryZoneScore, remindIfNoRecord);
		}

		if (canOpen) {
			player.dimension.playSound(this.isConcessionary(player) ? (isEntering ? entrySoundConcessionary : exitSoundConcessionary) : (isEntering ? entrySound : exitSound), pos);
		} else {
			player.dimension.playSound(failSound, pos);
		}

		return canOpen ? this.isConcessionary(player) ? TicketSystem.EnumTicketBarrierOpen.OPEN_CONCESSIONARY : TicketSystem.EnumTicketBarrierOpen.OPEN : TicketSystem.EnumTicketBarrierOpen.CLOSED;
	}

	public static addObjectivesIfMissing(): void {
		try {
			if (world.scoreboard.getObjective(this.BALANCE_OBJECTIVE) == undefined) {
				world.scoreboard.addObjective(this.BALANCE_OBJECTIVE/*Text.literal("Balance")*/);
			}
		} catch (e) {
			console.error(e);
		}
		try {
			if (world.scoreboard.getObjective(this.ENTRY_ZONE_OBJECTIVE) == undefined) {
				world.scoreboard.addObjective(this.ENTRY_ZONE_OBJECTIVE/*Text.literal("Entry Zone")*/);
			}
		} catch (e) {
			console.error(e);
		}
	}

	public static getPlayerScore(player: Player, objectiveName: string): ScoreCallback | undefined {
		const objective = world.scoreboard.getObjective(objectiveName)!;
		if (!objective.hasParticipant(player)) {
			objective.setScore(player, 0);
		}

		return {
			getScore: () => objective.getScore(player)!,
			setScore: (v) => objective.setScore(player, v),
			add: (v) => objective.addScore(player, v)
		};
	}

	private static onEnter(station: Station, player: Player, balanceScore: ScoreCallback, entryZoneScore: ScoreCallback, remindIfNoRecord: boolean) {
		const entryZone = entryZoneScore.getScore();

		if (entryZone != 0) {
			if (remindIfNoRecord) {
				player.onScreenDisplay.setActionBar({ translate: "gui.mts.already_entered" });
				return false;
			} else {
				entryZoneScore.setScore(0);
				balanceScore.add(-this.EVASION_FINE);
			}
		}

		if (balanceScore.getScore() >= 0) {
			entryZoneScore.setScore(this.encodeZone(station.zone));
			player.onScreenDisplay.setActionBar({
				translate: "gui.mts.enter_barrier",
				with: [
					`${station.name.replace('|', ' ')} (${station.zone})`,
					String(balanceScore.getScore())
				]
			});
			return true;
		} else {
			player.onScreenDisplay.setActionBar({
				translate: "gui.mts.insufficient_balance",
				with: [String(balanceScore.getScore())]
			});
			return false;
		}
	}

	private static onExit(station: Station, player: Player, balanceScore: ScoreCallback, entryZoneScore: ScoreCallback, remindIfNoRecord: boolean) {
		const entryZone = entryZoneScore.getScore();
		const fare = this.BASE_FARE + this.ZONE_FARE * Math.abs(station.zone - this.decodeZone(entryZone));
		const finalFare = entryZone != 0 ? this.isConcessionary(player) ? Math.ceil(fare / 2) : fare : this.EVASION_FINE;

		if (entryZone == 0 && remindIfNoRecord) {
			player.onScreenDisplay.setActionBar({ translate: "gui.mts.already_exited" });
			return false;
		} else {
			entryZoneScore.setScore(0);
			balanceScore.add(-finalFare);
			player.onScreenDisplay.setActionBar({
				translate: "gui.mts.exit_barrier",
				with: [
					`${station.name.replace('|', ' ')} (${station.zone})`,
					String(finalFare),
					String(balanceScore.getScore())
				]
			});
			return true;
		}
	}

	private static isConcessionary(player: Player) {
		return player.getGameMode() == GameMode.Creative;
	}

	private static encodeZone(zone: number) {
		return zone >= 0 ? zone + 1 : zone;
	}

	private static decodeZone(zone: number) {
		return zone > 0 ? zone - 1 : zone;
	}
}

export namespace TicketSystem {

	export enum EnumTicketBarrierOpen {

		CLOSED = "closed",
		OPEN = "open",
		OPEN_CONCESSIONARY = "open_concessionary"
	}
}