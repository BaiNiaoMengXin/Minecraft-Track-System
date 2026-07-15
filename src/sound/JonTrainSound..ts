import { Train } from "data/Train";
import { TrainSoundBase } from "./TrainSoundBase";
import { Vector3, world } from "@minecraft/server";
import { MTSClient } from "MTSClient";

export class JonTrainSoundConfig {

	public readonly doorSoundBaseId: string | null;
	public readonly speedSoundCount: number;
	public readonly doorCloseSoundTime: number;
	public readonly useAccelerationSoundsWhenCoasting: boolean;
	public readonly constantPlaybackSpeed: boolean;

	public constructor(doorSoundBaseId: string | null, speedSoundCount: number, doorCloseSoundTime: number, useAccelerationSoundsWhenCoasting: boolean, constantPlaybackSpeed: boolean = false) {
		this.doorSoundBaseId = doorSoundBaseId;
		this.speedSoundCount = ~~speedSoundCount;
		this.doorCloseSoundTime = doorCloseSoundTime;
		this.useAccelerationSoundsWhenCoasting = useAccelerationSoundsWhenCoasting;
		this.constantPlaybackSpeed = constantPlaybackSpeed;
	}
}

export class JonTrainSound extends TrainSoundBase {

	private train: Train | null = null;

	public readonly soundId: string | null;
	public readonly config: JonTrainSoundConfig;

	private static readonly SOUND_GROUP_LETTERS = ['a', 'b', 'c'];
	private static readonly SOUND_GROUP_SIZE = this.SOUND_GROUP_LETTERS.length;
	private static readonly SOUND_ACCELERATION = "_acceleration_";
	private static readonly SOUND_DECELERATION = "_deceleration_";
	private static readonly SOUND_DOOR_OPEN = "_door_open";
	private static readonly SOUND_DOOR_CLOSE = "_door_close";
	private static readonly SOUND_RANDOM = "_random";
	private static readonly RANDOM_SOUND_CHANCE = 300;

	public constructor(soundId: string | null, config: JonTrainSoundConfig) {
		super()
		this.config = config;
		this.soundId = soundId;
	}

	public override createTrainInstance(train: Train): TrainSoundBase {
		const result =  new JonTrainSound(this.soundId, this.config);
		result.train = train
		return result;
	}

	public override playNearestCar(pos: Vector3, carIndex: number) {
		if (this.config.speedSoundCount > 0 && this.soundId != null) {
			// TODO: Better sound system to adapt to different acceleration
			const referenceAcceleration = this.config.constantPlaybackSpeed ? this.train!.accelerationConstant : Train.ACCELERATION_DEFAULT;
			const floorSpeed = Math.floor(this.train!.getSpeed() / referenceAcceleration / MTSClient.TICKS_PER_SPEED_SOUND);
			if (floorSpeed > 0) {
				const random = Math.random();
				const dimension = world.getDimension("overworld");

				if (floorSpeed >= 30 && ~~(random * JonTrainSound.RANDOM_SOUND_CHANCE) == 0) {
					dimension.playSound(this.soundId + JonTrainSound.SOUND_RANDOM, pos, { volume: 10 });
				}

				const index = ~~Math.min(floorSpeed, this.config.speedSoundCount) - 1;
				const isAccelerating = this.train!.speedChange() == 0 ? this.config.useAccelerationSoundsWhenCoasting || random < 0.5 : this.train!.speedChange() > 0;
				const speedSoundId = this.soundId + (isAccelerating ? JonTrainSound.SOUND_ACCELERATION : JonTrainSound.SOUND_DECELERATION) + ~~(index / JonTrainSound.SOUND_GROUP_SIZE) + JonTrainSound.SOUND_GROUP_LETTERS[index % JonTrainSound.SOUND_GROUP_SIZE];
				dimension.playSound(speedSoundId, pos);
			}
		}
	}

	public override playAllCars(pos: Vector3, carIndex: number) {
	}

	public override playAllCarsDoorOpening(pos: Vector3, carIndex: number) {
		if (this.config.doorSoundBaseId != null) {
			let soundId: string | null;
			if (this.train!.justOpening()) {
				soundId = this.config.doorSoundBaseId + JonTrainSound.SOUND_DOOR_OPEN;
			} else if (this.train!.justClosing(this.config.doorCloseSoundTime)) {
				soundId = this.config.doorSoundBaseId + JonTrainSound.SOUND_DOOR_CLOSE;
			} else {
				soundId = null;
			}
			if (soundId != null) {
				world.getDimension("overworld").playSound(soundId, pos);
			}
		}
	}
}
