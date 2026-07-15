import { TrainSoundBase } from "sound/TrainSoundBase";
import { BveTrainSoundConfig } from "./BveTrainSoundConfig";
import { Train } from "data/Train";
import { TrainLoopingSoundInstance } from "sound/TrainLoopingSoundInstance";
import { Vector3, world } from "@minecraft/server";
import { TrainRegistry } from "extensions/TrainRegistry";

export class BveTrainSound extends TrainSoundBase {

	private accelLastElapsed: number = 0;
	private onRouteLastElapsed = false;

	private motorCurrentOutput = 0;
	private motorBreakerTimer = -1;

	private mrPress: number = 0;
	private isCompressorActive: boolean = false;
	private isCompressorActiveLastElapsed: boolean = false;

	private readonly train: Train | null;

	public readonly config: BveTrainSoundConfig;

	private readonly soundLoopMotor: TrainLoopingSoundInstance[];
	private readonly soundLoopRun: TrainLoopingSoundInstance | null;
	private readonly soundLoopFlange: TrainLoopingSoundInstance | null;
	private readonly soundLoopNoise: TrainLoopingSoundInstance | null;
	private readonly soundLoopShoe: TrainLoopingSoundInstance | null;
	private readonly soundLoopCompressor: TrainLoopingSoundInstance | null;
	private readonly bogieRailId: number[][];

	public constructor(config: BveTrainSoundConfig, train: Train | null = null) {
		super()
		this.config = config;
		this.train = train;

		if (train == null) {
			this.soundLoopMotor = [];
			this.soundLoopRun = null;
			this.soundLoopFlange = null;
			this.soundLoopNoise = null;
			this.soundLoopShoe = null;
			this.soundLoopCompressor = null;
			this.bogieRailId = [];
		} else {
			this.bogieRailId = new Array(train.trainCars).fill(null).map(() => new Array(2));

			this.mrPress =  ~~(Math.random() * (config.soundCfg.mrPressMax + 1 - config.soundCfg.mrPressMin)) + config.soundCfg.mrPressMin;
			this.isCompressorActive = (~~(Math.random() * 20)) == 0; // Currently, set to 1/20 at client-side load
			this.isCompressorActiveLastElapsed = this.isCompressorActive;

			this.soundLoopRun = config.soundCfg.run[0] == null ? null : new TrainLoopingSoundInstance(config.soundCfg.run[0], train);
			this.soundLoopFlange = config.soundCfg.flange[0] == null ? null : new TrainLoopingSoundInstance(config.soundCfg.flange[0], train);
			this.soundLoopNoise = config.soundCfg.noise == null ? null : new TrainLoopingSoundInstance(config.soundCfg.noise, train);
			this.soundLoopShoe = config.soundCfg.shoe == null ? null : new TrainLoopingSoundInstance(config.soundCfg.shoe, train);
			this.soundLoopCompressor = config.soundCfg.compressorLoop == null ? null : new TrainLoopingSoundInstance(config.soundCfg.compressorLoop, train);

			this.soundLoopMotor = new Array(config.soundCfg.motor.length);
			for (let i = 0; i < Math.min(config.soundCfg.motor.length, config.motorData.getSoundCount()); ++i) {
				if (config.soundCfg.motor[i] != null) {
					this.soundLoopMotor[i] = new TrainLoopingSoundInstance(config.soundCfg.motor[i], train);
				}
			}
		}
	}

	public override createTrainInstance(train: Train): TrainSoundBase {
		return new BveTrainSound(this.config, train);
	}

	public override playNearestCar(pos: Vector3, carIndex: number) {
		if (this.train == null) {
			return;
		}

		const deltaT = 1;
		const speed = this.train.getSpeed() * 20;
		const accel = this.train.speedChange(); // TODO sounds weird when coasting or braking
		const speedKph = speed * 3.6;

		// Rolling noise
		if (this.soundLoopRun != null) {
			this.soundLoopRun.setData(Math.min(1, speed * 0.04), speed * 0.04, pos);
		}

		// Simulation of circuit breaker in traction controller
		let motorTarget = Math.sign(accel);
		if (motorTarget == 0 && speed != 0) {
			motorTarget = this.config.soundCfg.motorOutputAtCoast;
		}
		if (motorTarget < 0 && speed < this.config.soundCfg.regenerationLimit) {
			this.motorCurrentOutput = 0; // Regeneration brake cut off below limit speed
			this.motorBreakerTimer = -1;
		} else if (motorTarget > 0 && speed < 1) {
			this.motorCurrentOutput = 1; // Disable delay at startup
			this.motorBreakerTimer = -1;
		} else if (motorTarget != this.motorCurrentOutput && this.motorBreakerTimer < 0) {
			this.motorBreakerTimer = 0;
			if (motorTarget != 0 && this.motorCurrentOutput != 0) {
				this.motorCurrentOutput = 0; // Loose behavior but sounds OK
			}
		}
		if (this.motorBreakerTimer >= 0) {
			this.motorBreakerTimer += deltaT;
			if (this.motorBreakerTimer > this.config.soundCfg.breakerDelay) {
				this.motorBreakerTimer = -1;
				this.motorCurrentOutput = motorTarget;
			}
		}

		// Simulation of main reservoir air compressor
		if (this.mrPress <= this.config.soundCfg.mrPressMin) {
			this.isCompressorActive = true;
			this.mrPress = this.config.soundCfg.mrPressMin;
		} else if (this.mrPress >= this.config.soundCfg.mrPressMax) {
			this.isCompressorActive = false;
			this.mrPress = this.config.soundCfg.mrPressMax;
		}
		if (this.isCompressorActive) {
			this.mrPress += deltaT * this.config.soundCfg.mrCompressorSpeed;
		}
		if (this.soundLoopCompressor != null) {
			// NOTE: Attack sound playback is not to BVE specification.
			this.soundLoopCompressor.setData(this.isCompressorActive ? 1 : 0, 1, pos);
		}
		if (this.isCompressorActive && !this.isCompressorActiveLastElapsed) {
			BveTrainSound.playLocalSound(this.config.soundCfg.compressorAttack, pos);
		} else if (!this.isCompressorActive && this.isCompressorActiveLastElapsed) {
			BveTrainSound.playLocalSound(this.config.soundCfg.compressorRelease, pos);
		}

		// Motor noise
		for (let i = 0; i < this.config.motorData.getSoundCount(); ++i) {
			if (this.soundLoopMotor[i] == null) {
				continue;
			}
			this.soundLoopMotor[i].setData(this.config.motorData.getVolume(i, speedKph, this.motorCurrentOutput) * this.config.soundCfg.motorVolumeMultiply, this.config.motorData.getPitch(i, speedKph, this.motorCurrentOutput), pos);
		}

		// TODO Play flange sounds
		// Flange noise
		if (this.soundLoopFlange != null) {
			this.soundLoopFlange.setData(0, 1, pos);
		}

		// Brake shoe rubbing noise (below regeneration brake cutoff limit)
		if (this.soundLoopShoe != null) {
			const shoePitch = 1 / (speed + 1) + 1;
			let shoeGain = speed < this.config.soundCfg.regenerationLimit && accel < 0 ? 1 : 0;
			if (speed < 1.39) {
				const t = speed * speed;
				shoeGain *= 1.5552 * t - 0.746496 * speed * t;
			} else if (speed > 12.5) {
				const t = speed - 12.5;
				shoeGain *= 1 / (0.1 * t * t + 1);
			}
			this.soundLoopShoe.setData(shoeGain, shoePitch, pos);
		}

		// Constant loop noise
		if (this.soundLoopNoise != null) {
			this.soundLoopNoise.setData(this.train.getIsOnRoute() ? 1 : 0, 1, pos);
		}

		// Air brake application and release noise
		if (this.accelLastElapsed < 0 && accel >= 0) {
			BveTrainSound.playLocalSound(this.config.soundCfg.brakeHandleRelease, pos);
			if (speed < this.config.soundCfg.regenerationLimit) {
				BveTrainSound.playLocalSound(this.config.soundCfg.airZero, pos);
			}
		} else if (this.accelLastElapsed <= 0 && accel > 0 && speed < 0.3) {
			BveTrainSound.playLocalSound(this.config.soundCfg.airHigh, pos);
		} else if (this.accelLastElapsed >= 0 && accel < 0) {
			this.mrPress -= this.config.soundCfg.mrServiceBrakeReduce;
			BveTrainSound.playLocalSound(this.config.soundCfg.brakeHandleApply, pos);
		}

		// Emergency brake application after returning to depot
		if (this.onRouteLastElapsed && !this.train.getIsOnRoute()) {
			BveTrainSound.playLocalSound(this.config.soundCfg.brakeEmergency, pos);
		}

		this.accelLastElapsed = accel;
		this.onRouteLastElapsed = this.train.getIsOnRoute();
		this.isCompressorActiveLastElapsed = this.isCompressorActive;
	}

	public override playAllCars(pos: Vector3, carIndex: number) {
		if (this.train == null) {
			return;
		}

		const trainProperties = TrainRegistry.getTrainProperties(this.train.trainId);

		if (this.config.soundCfg.joint[0] == null) {
			return;
		}

		const bogieOffsetFront = this.train.spacing / 2 - trainProperties.bogiePosition;
		const bogieOffsetRear = this.train.spacing / 2 + trainProperties.bogiePosition;

		const pitch = this.train.getSpeed() * 20 / 12.5;
		const gain = pitch < 0.5 ? 2 * pitch : 1;
		if (bogieOffsetFront >= 0) {
			const indexFront = this.train.getIndex(this.train.getRailProgress() - this.train.spacing * carIndex - bogieOffsetFront, false);
			if (indexFront != this.bogieRailId[carIndex][0]) {
				this.bogieRailId[carIndex][0] = indexFront;
				BveTrainSound.playLocalSound(this.config.soundCfg.joint[0], pos, gain, pitch);
			}
		}
		if (bogieOffsetRear >= 0) {
			const indexRear = this.train.getIndex(this.train.getRailProgress() - this.train.spacing * carIndex - bogieOffsetRear, false);
			if (indexRear != this.bogieRailId[carIndex][1]) {
				this.bogieRailId[carIndex][1] = indexRear;
				BveTrainSound.playLocalSound(this.config.soundCfg.joint[0], pos, gain, pitch);
			}
		}
	}

	public override playAllCarsDoorOpening(pos: Vector3, carIndex: number) {
		if (this.train == null) {
			return;
		}

		let soundEvent: string | null;
		if (this.train.justOpening() && this.config.soundCfg.doorOpen != null) {
			soundEvent = this.config.soundCfg.doorOpen;
		} else if (this.train.justClosing(this.config.soundCfg.doorCloseSoundLength) && this.config.soundCfg.doorClose != null) {
			soundEvent = this.config.soundCfg.doorClose;
		} else {
			soundEvent = null;
		}

		BveTrainSound.playLocalSound(soundEvent, pos);
	}

	private static playLocalSound(event: string | null, pos: Vector3, gain: number = 1, pitch: number = 1) {
		if (event == null) {
			return;
		}
		world.getDimension("overworld").playSound(event, pos, {
			volume: Math.min(1, gain), 
			pitch: Math.max(pitch, 0.01)
		});
	}
}
