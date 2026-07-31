import { BlockPos } from "util/math/BlockPos";
import { BetterMap } from "./BetterMap";
import { RailwayData } from "./RailwayData";
import { RailwayDataModuleBase } from "./RailwayDataModuleBase";
import { Rail } from "./Rail";
import { Player, world } from "@minecraft/server";
import { Train } from "./Train";
import { TrainBase } from "./TrainBase";

export class RailwayDataDriveTrainModule extends RailwayDataModuleBase {

	private readonly acceleratePlayers = new Set<string>();
	private readonly brakePlayers = new Set<string>();
	private readonly doorsPlayers = new Set<string>();

	private oldAcceleratePlayers = new Set<string>();
	private oldBrakePlayers = new Set<string>();
	private oldDoorsPlayers = new Set<string>();

	public constructor(railwayData: RailwayData, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>) {
		super(railwayData, rails);
	}

	public tick(): void {
		this.acceleratePlayers.clear();
		this.brakePlayers.clear();
		this.doorsPlayers.clear();

		const currentAccel = new Set<string>();
		const currentBrake = new Set<string>();
		const currentDoors = new Set<string>();
		
        world.getAllPlayers().forEach(player => {
			if (TrainBase.isHoldingKey(player)) {
				const vec = player.inputInfo.getMovementVector();
				const accel = vec.y > 0.5;
				const brake = vec.y < -0.5;
				const doors = vec.y < 0.5 && vec.y > -0.5 && Math.abs(vec.x) > 0.5;
				const playerId = player.id
				if (accel) currentAccel.add(playerId);
				if (brake) currentBrake.add(playerId);
				if (doors) currentDoors.add(playerId);

				if (accel && !this.oldAcceleratePlayers.has(playerId)) {
					this.acceleratePlayers.add(playerId)
				}
				if (brake && !this.oldBrakePlayers.has(playerId)) {
					this.brakePlayers.add(playerId)
				}
				if (doors && !this.oldDoorsPlayers.has(playerId)) {
					this.doorsPlayers.add(playerId)
				}
			}
        });

		this.oldAcceleratePlayers = currentAccel;
		this.oldBrakePlayers = currentBrake;
		this.oldDoorsPlayers = currentDoors;
	}

	public drive(train: Train) {
		let dirty = false;
		for (const [playerId] of train.ridingEntities) {
			if (this.acceleratePlayers.has(playerId) && train.changeManualSpeed(true)) {
				dirty = true;
			} else if (this.brakePlayers.has(playerId) && train.changeManualSpeed(false)) {
				dirty = true;
			}
			if (this.doorsPlayers.has(playerId) && train.toggleDoors()) {
				dirty = true;
			}
		}
		return dirty;
	}
}
