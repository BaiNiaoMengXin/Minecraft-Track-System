import { PathData } from "path/PathData";
import { NameColorDataBase } from "./NameColorDataBase";
import { Block, Entity, Player, system, Vector3, world } from "@minecraft/server";
import { TransportMode } from "./TransportMode";
import { RailwayData } from "./RailwayData";
import { TrainType } from "./TrainType";
import { RailType } from "./RailType";
import { Depot } from "./Depot";
import { BlockPos } from "util/math/BlockPos";
import { Vec3 } from "util/math/Vec3";
import { Mth } from "util/math/Mth";
import { BetterMap } from "./BetterMap";
import { MessagePackHelper } from "./MessagePackHelper";

type CalculateCarCallback = (x: number, y: number, z: number, yaw: number, pitch: number, realSpacing: number, doorLeftOpen: boolean, doorRightOpen: boolean) => void;

export abstract class TrainBase extends NameColorDataBase {

	protected speed: number = 0;
	protected railProgress: number = 0;
	protected doorTarget: boolean = false;
	protected doorValue: number = 0;
	protected elapsedDwellTicks: number = 0;
	protected nextStoppingIndex: number = 0;
	protected nextPlatformIndex: number = 0;
	protected reversed: boolean = false;
	protected isOnRoute: boolean = false;
	protected isCurrentlyManual: boolean;
	protected manualNotch: number = 0;

	public readonly sidingId: number;
	public readonly trainId: string;
	public readonly baseTrainType: string;
	public readonly transportMode: TransportMode;
	public readonly spacing: number;
	public readonly width: number;
	public readonly trainCars: number;
	public readonly accelerationConstant: number;
	public readonly isManualAllowed: boolean;
	public readonly maxManualSpeed: number;
	public readonly manualToAutomaticTime: number;
	public readonly path: PathData[];

	protected readonly distances: number[];
	protected readonly repeatIndex1: number;
	protected readonly repeatIndex2: number;
	protected readonly ridingEntities: BetterMap<Player, {carrier: Entity, ridingCar: number, offsets: Vec3}> = new BetterMap();
	// protected readonly SimpleContainer inventory;

	private readonly railLength: number;

	public static readonly ACCELERATION_DEFAULT: number = 0.01; // m/tick^2
	public static readonly MAX_ACCELERATION: number = 0.05; // m/tick^2
	public static readonly MIN_ACCELERATION: number = 0.001; // m/tick^2
	public static readonly DOOR_MOVE_TIME: number = 64;
	protected static readonly MAX_CHECK_DISTANCE: number = 32;
	protected static readonly DOOR_DELAY: number = 20;

	public constructor(id: number, sidingId: number, railLength: number, trainId: string, baseTrainType: string, trainCars: number, path: PathData[], distances: number[], repeatIndex1: number, repeatIndex2: number, accelerationConstant: number, isManualAllowed: boolean, maxManualSpeed: number, manualToAutomaticTime: number);

	public constructor(
			sidingId: number, railLength: number,
			path: PathData[], distances: number[], repeatIndex1: number, repeatIndex2: number,
			accelerationConstant: number, isManualAllowed: boolean, maxManualSpeed: number, manualToAutomaticTime: number,
			map: Record<string, unknown>
	)
	
	public constructor(
			arg1: number, arg2: number,
			arg3: number | PathData[], arg4: string | number[], arg5: string | number, arg6: number,
			arg7: PathData[] | number, arg8: number[] | boolean, arg9: number, arg10: number,
			arg11: number | Record<string, unknown>, arg12?: boolean, arg13?: number, arg14?: number
	) {
		if (arg14 != undefined) {
			super(arg1);
			this.sidingId = arg2 as number;
			this.railLength = RailwayData.round(arg3 as number, 3);
			this.trainId = arg4 as string;
			// TODO temporary code for backwards compatibility
			let baseTrainType = arg5 as string;
			baseTrainType = baseTrainType.startsWith("base_") ? baseTrainType.replace("base_", "train_") : baseTrainType;
			// TODO temporary code end
			this.baseTrainType = baseTrainType;
			this.transportMode = TransportMode.TRAIN;
			this.spacing = TrainType.getSpacing(baseTrainType);
			this.width = TrainType.getWidth(baseTrainType);
			this.trainCars = arg6;
			this.isManualAllowed = arg12!;
			this.isCurrentlyManual = arg12!;
			this.maxManualSpeed = arg13!;
			this.manualToAutomaticTime = arg14;
			this.path = arg7 as PathData[];
			this.distances = arg8 as number[];
			this.repeatIndex1 = arg9;
			this.repeatIndex2 = arg10;
			const tempAccelerationConstant = RailwayData.round(arg11 as number, 3);
			this.accelerationConstant = tempAccelerationConstant <= 0 ? TrainBase.ACCELERATION_DEFAULT : tempAccelerationConstant;
		} else {
			super(arg11 as Record<string, unknown>);
			const messagePackHelper = new MessagePackHelper(arg11 as ReturnType<this['toMessagePack']>);

			this.sidingId = arg1;
			this.railLength = RailwayData.round(arg2, 3)
			this.path = arg3 as PathData[];
			this.distances = arg4 as number[];
			this.repeatIndex1 = arg5 as number;
			this.repeatIndex2 = arg6 as number;
			this.accelerationConstant = arg7 as number;
			this.isManualAllowed = arg8 as boolean;
			this.maxManualSpeed = arg9;
			this.manualToAutomaticTime = arg10;

			this.speed = messagePackHelper.getDouble("speed");
			this.railProgress = messagePackHelper.getDouble("rail_progress");
			this.elapsedDwellTicks = messagePackHelper.getDouble("elapsed_dwell_ticks");
			this.nextStoppingIndex = messagePackHelper.getInt("next_stopping_index");
			this.nextPlatformIndex = messagePackHelper.getInt("next_platform_index");
			this.reversed = messagePackHelper.getBoolean("reversed");

			const tempTrainId = messagePackHelper.getString("train_custom_id").toLowerCase();
			// TODO temporary code for backwards compatibility
			let tempBaseTrainType = messagePackHelper.getString("train_type").toLowerCase();
			this.baseTrainType = tempBaseTrainType.startsWith("base_") ? tempBaseTrainType.replace("base_", "train_") : tempBaseTrainType;
			// TODO temporary code end
			this.trainId = tempTrainId == "" ? this.baseTrainType : tempTrainId;
			this.transportMode = TrainType.getTransportMode(this.baseTrainType);
			this.spacing = TrainType.getSpacing(this.baseTrainType);
			this.width = TrainType.getWidth(this.baseTrainType);
			this.trainCars = Math.min(this.transportMode.maxLength, Math.floor(this.railLength / this.spacing));
			this.isCurrentlyManual = messagePackHelper.getBoolean("is_currently_manual");
			
			this.isOnRoute = messagePackHelper.getBoolean("is_on_route");

			// packet.riding_entities.forEach(([playerId, data]) => {
			// 	world.getAllPlayers
			// })
		}
	}

	public dispose() {
		system.run(() => {
			Array.from(this.ridingEntities.values()).forEach(v => v.carrier.remove())
		})
	}

	public override toMessagePack() {
		return {
			...super.toMessagePack(),

			speed: this.speed,
			rail_progress: this.railProgress,
			elapsed_dwell_ticks: this.elapsedDwellTicks,
			next_stopping_index: this.nextStoppingIndex,
			next_platform_index: this.nextPlatformIndex,
			reversed: this.reversed,
			train_custom_id: this.trainId,
			train_type: this.baseTrainType,
			is_currently_manual: this.isCurrentlyManual,
			is_on_route: this.isOnRoute,

			// riding_entities: Array.from(this.ridingEntities, ([player, data]) => [player.id, { carrier: data.carrier.id, riding_car: data.ridingCar, offsets: data.offsets }]) as [string, {carrier: string, riding_car: number, offsets: Vec3}][]
		} as const;
	}

	protected override hasTransportMode(): boolean {
		return false;
	}

	public getIsOnRoute(): boolean {
		return this.isOnRoute;
	}

	public getRailProgress(): number {
		return this.railProgress;
	}

	public closeToDepot(trainDistance: number): boolean {
		return !this.isOnRoute || this.railProgress < trainDistance + this.railLength;
	}

	public isCurrentlyManual_(): boolean {
		return this.isCurrentlyManual;
	}

	public changeManualSpeed(isAccelerate: boolean): boolean {
		if (this.doorValue == 0 && isAccelerate && this.manualNotch >= -2 && this.manualNotch < 2) {
			this.manualNotch++;
			return true;
		} else if (!isAccelerate && this.manualNotch > -2) {
			this.manualNotch--;
			return true;
		} else {
			return false;
		}
	}

	public toggleDoors(): boolean {
		if (this.speed == 0) {
			this.doorTarget = !this.doorTarget;
			this.manualNotch = -2;
			return true;
		} else {
			this.doorTarget = false;
			return false;
		}
	}


	public getIndex(car: number, trainSpacing: number, roundDown: boolean): number;

	public getIndex(tempRailProgress: number, roundDown: boolean): number;

	public getIndex(arg1: number, arg2: number | boolean, arg3?: boolean): number {
		if (arg3 != undefined) {
			return this.getIndex(this.getRailProgress_(arg1, arg2 as number), arg3);
		} else {
			const roundDown = arg2
			const tempRailProgress = arg1;

			for (let i = 0; i < this.path.length; i++) {
				const tempDistance = this.distances[i];
				if (tempRailProgress < tempDistance || roundDown && tempRailProgress == tempDistance) {
					return i;
				}
			}
			return this.path.length - 1;
		}
	}

	public getRailSpeed(railIndex: number): number {
		const thisRail = this.path[railIndex].rail.railType;
		let railSpeed = 0;
		if (thisRail.canAccelerate) {
			railSpeed = thisRail.maxBlocksPerTick;
		} else {
			const lastRail = railIndex > 0 ? this.path[railIndex - 1].rail.railType : thisRail;
			railSpeed = Math.max(lastRail.canAccelerate ? lastRail.maxBlocksPerTick : RailType.getDefaultMaxBlocksPerTick(this.transportMode), this.speed);
		}
		return railSpeed;
	}

	public isPlayerRiding(player: Player): boolean {
		return this.ridingEntities.has(player);
	}

	public getSpeed(): number {
		return this.speed;
	}

	public getDoorValue(): number {
		return this.doorValue;
	}

	public getElapsedDwellTicks(): number {
		return this.elapsedDwellTicks;
	}

	public isReversed(): boolean {
		return this.reversed;
	}

	public isOnRoute_(): boolean {
		return this.isOnRoute;
	}

	public getTotalDwellTicks(): number {
		return this.path[this.nextStoppingIndex].dwellTime * 10;
	}

	protected simulateTrain_(ticksElapsed: number, depot: Depot): void {
		try {
			if (this.nextStoppingIndex >= this.path.length) {
				console.log(`调试: 列车 ${this.trainId} 的下一个停车索引 ${this.nextStoppingIndex} 超出路径长度 ${this.path.length}，跳过模拟。`);    
				return;
			}

			let tempDoorOpen: boolean;
			let tempDoorValue: number;
			const totalDwellTicks = this.getTotalDwellTicks();

			if (!this.isOnRoute) {
				this.railProgress = (this.railLength + this.trainCars * this.spacing) / 2;
				this.reversed = false;
				tempDoorOpen = false;
				tempDoorValue = 0;
				this.speed = 0;
				this.nextStoppingIndex = 0;

				if (!this.isCurrentlyManual && this.canDeploy_(depot) || this.isCurrentlyManual && this.manualNotch > 0) {
					this.startUp(this.trainCars, this.spacing, this.isOppositeRail());
				}
			} else {
				const newAcceleration = this.accelerationConstant * ticksElapsed;

				if (this.railProgress >= this.distances[this.distances.length - 1] - (this.railLength - this.trainCars * this.spacing) / 2) {
					this.isOnRoute = false;
					this.manualNotch = -2;
					this.ridingEntities.clear();
					tempDoorOpen = false;
					tempDoorValue = 0;
				} else {
					if (this.speed <= 0) {
						this.speed = 0;

						const isOppositeRail = this.isOppositeRail();
						const railBlocked = this.isRailBlocked(this.getIndex(0, this.spacing, true) + (isOppositeRail ? 2 : 1));

						if (totalDwellTicks == 0) {
							tempDoorOpen = false;
						} else {
							if (this.elapsedDwellTicks == 0 && this.isRepeat() && this.getIndex(this.railProgress, false) >= this.repeatIndex2 && this.distances.length > this.repeatIndex1) {
								if (this.path[this.repeatIndex2].isOppositeRail(this.path[this.repeatIndex1])) {
									this.railProgress = this.distances[this.repeatIndex1 - 1] + this.trainCars * this.spacing;
									this.reversed = !this.reversed;
								} else {
									this.railProgress = this.distances[this.repeatIndex1];
								}
							}

							if (this.elapsedDwellTicks < totalDwellTicks - TrainBase.DOOR_MOVE_TIME - TrainBase.DOOR_DELAY - ticksElapsed || !railBlocked) {
								this.elapsedDwellTicks += ticksElapsed;
							}

							tempDoorOpen = this.openDoors();
						}

						if ((this.isCurrentlyManual || this.elapsedDwellTicks >= totalDwellTicks) && !railBlocked && (!this.isCurrentlyManual || this.manualNotch > 0)) {
							this.startUp(this.trainCars, this.spacing, isOppositeRail);
						}
					} else {
                        const checkIndex = this.getIndex(0, this.spacing, true) + 1;
                        if (this.isRailBlocked(checkIndex)) {
                            this.nextStoppingIndex = checkIndex - 1;
                        } else if (this.nextPlatformIndex > 0 && this.nextPlatformIndex < this.path.length) {
                            this.nextStoppingIndex = this.nextPlatformIndex;
                            if (this.manualNotch < -2) {
                                this.manualNotch = 0;
                            }
                        }

						const stoppingDistance = this.distances[this.nextStoppingIndex] - this.railProgress;
						if (!this.transportMode.continuousMovement && stoppingDistance < 0.5 * this.speed * this.speed / this.accelerationConstant) {
							this.speed = stoppingDistance <= 0 ? TrainBase.ACCELERATION_DEFAULT : Math.max(this.speed - (0.5 * this.speed * this.speed / stoppingDistance) * ticksElapsed, TrainBase.ACCELERATION_DEFAULT);
							this.manualNotch = -3;
						} else {
							if (this.isCurrentlyManual) {
								if (this.manualNotch >= -2) {
									const railType = TrainBase.convertMaxManualSpeed(this.maxManualSpeed);
									this.speed = Mth.clamp(this.speed + this.manualNotch * newAcceleration / 2, 0, !railType ? RailType.IRON.maxBlocksPerTick : railType.maxBlocksPerTick);
								}
							} else {
								const railSpeed = this.getRailSpeed(this.getIndex(0, this.spacing, false));
								if (this.speed < railSpeed) {
									this.speed = Math.min(this.speed + newAcceleration, railSpeed);
									this.manualNotch = 2;
								} else if (this.speed > railSpeed) {
									this.speed = Math.max(this.speed - newAcceleration, railSpeed);
									this.manualNotch = -2;
								} else {
									this.manualNotch = 0;
								}
							}
						}

						tempDoorOpen = this.transportMode.continuousMovement && this.openDoors();
					}

					this.railProgress += this.speed * ticksElapsed;
					if (!this.transportMode.continuousMovement && this.railProgress > this.distances[this.nextStoppingIndex]) {
						this.railProgress = this.distances[this.nextStoppingIndex];
						this.speed = 0;
						this.manualNotch = -2;
					}

					tempDoorValue = Mth.clamp(this.doorValue + ticksElapsed * (this.doorTarget ? 1 : -1) / TrainBase.DOOR_MOVE_TIME, 0, 1);
				}
			}

			this.doorTarget = tempDoorOpen;
			this.doorValue = tempDoorValue;
			if (this.doorTarget || this.doorValue != 0) {
				this.manualNotch = -2;
			}

			if (this.path.length != 0) {
				const positions: Vec3[] = new Array<Vec3>(this.trainCars + 1);
				for (let i = 0; i <= this.trainCars; i++) {
					positions[i] = this.getRoutePosition(this.reversed ? this.trainCars - i : i, this.spacing);
				}
                
				if (this.handlePositions(positions, ticksElapsed)) {
                    
					const prevX: number[] = [0];
					const prevY: number[] = [0];
					const prevZ: number[] = [0];
					const prevYaw: number[] = [0];
					const prevPitch: number[] = [0];

					for (let i = 0; i < this.trainCars; i++) {
						const ridingCar = i;
						this.calculateCar(positions, i, totalDwellTicks, (x, y, z, yaw, pitch, realSpacing, doorLeftOpen, doorRightOpen) => {
							this.simulateCar(
									ridingCar, ticksElapsed,
									x, y, z,
									yaw, pitch,
									prevX[0], prevY[0], prevZ[0],
									prevYaw[0], prevPitch[0],
									doorLeftOpen, doorRightOpen, realSpacing
							);
							prevX[0] = x;
							prevY[0] = y;
							prevZ[0] = z;
							prevYaw[0] = yaw;
							prevPitch[0] = pitch;
						});
					}
				}
			}
		} catch (e) {
			console.error(e);
		}
	}

	protected calculateCar(positions: Vec3[], index: number, dwellTicks: number, calculateCarCallback: CalculateCarCallback) {
		const pos1: Vector3 = positions[index];
		const pos2: Vec3 = positions[index + 1];

		if (pos1 != null && pos2 != null) {
			const x: number = TrainBase.getAverage(pos1.x, pos2.x);
			const y: number = TrainBase.getAverage(pos1.y, pos2.y) + 1;
			const z: number = TrainBase.getAverage(pos1.z, pos2.z);

			const realSpacing = pos2.distanceTo(pos1);
			const yaw = Math.atan2(pos2.x - pos1.x, pos2.z - pos1.z);
			const pitch = realSpacing == 0 ? 0 : this.asin((pos2.y - pos1.y) / realSpacing);
			const doorLeftOpen: boolean = this.scanDoors(x, y, z, Math.PI + yaw, pitch, realSpacing / 2, dwellTicks) && this.doorValue > 0;
			const doorRightOpen: boolean = this.scanDoors(x, y, z, yaw, pitch, realSpacing / 2, dwellTicks) && this.doorValue > 0;

			calculateCarCallback(x, y, z, yaw, pitch, realSpacing, doorLeftOpen, doorRightOpen);
		}
	}

	protected startUp(trainCars: number, trainSpacing: number, isOppositeRail: boolean) {
		this.doorTarget = false;
		this.doorValue = 0;
		this.nextPlatformIndex = this.nextStoppingIndex;
	}

	protected openDoors(): boolean {
		return this.doorTarget;
	}

	protected getModelZOffset(): number {
		return 0;
	}

	protected isRepeat(): boolean {
		return this.repeatIndex1 > 0 && this.repeatIndex2 > 0;
	}

	protected abstract simulateCar(
			ridingCar: number, ticksElapsed: number,
			carX: number, carY: number, carZ: number, carYaw: number, carPitch: number,
			prevCarX: number, prevCarY: number, prevCarZ: number, prevCarYaw: number, prevCarPitch: number,
			doorLeftOpen: boolean, doorRightOpen: boolean, realSpacing: number
	): void;

	protected abstract handlePositions(positions: Vec3[], ticksElapsed: number): boolean;

	protected abstract canDeploy_(depot: Depot): boolean;

	protected abstract isRailBlocked(checkIndex: number): boolean;

	protected abstract skipScanBlocks(trainX: number, trainY: number, trainZ: number): boolean;

	protected abstract openDoors_(block: Block, checkPos: BlockPos, dwellTicks: number): boolean;

	protected abstract asin(value: number): number;

	private isOppositeRail(): boolean {
		return this.path.length > this.nextStoppingIndex + 1 && 
            this.railProgress == this.distances[this.nextStoppingIndex] && 
            this.path[this.nextStoppingIndex].isOppositeRail(this.path[this.nextStoppingIndex + 1]);
	}

	private getRailProgress_(car: number, trainSpacing: number): number {
		return this.railProgress - car * trainSpacing;
	}

	private getRoutePosition(car: number, trainSpacing: number): Vec3 {
		const tempRailProgress = Math.max(this.getRailProgress_(car, trainSpacing) - this.getModelZOffset(), 0);
		const index = this.getIndex(tempRailProgress, false);
		return this.path[index].rail.getPosition(tempRailProgress - (index == 0 ? 0 : this.distances[index - 1])).add(0, this.transportMode.railOffset, 0);
	}

	private scanDoors(trainX: number, trainY: number, trainZ: number, checkYaw: number, pitch: number, halfSpacing: number, dwellTicks: number): boolean {
		if (this.skipScanBlocks(trainX, trainY, trainZ)) {
			return false;
		}

		let hasPlatform = false;
		const offsetVec = new Vec3(1, 0, 0).yRot(checkYaw).xRot(pitch);
		const traverseVec = new Vec3(0, 0, 1).yRot(checkYaw).xRot(pitch);

		for (let checkX = 1; checkX <= 3; checkX++) {
			for (let checkY = -2; checkY <= 3; checkY++) {
				for (let checkZ = -halfSpacing; checkZ <= halfSpacing; checkZ++) {
					const checkPos = RailwayData.newBlockPos(trainX + offsetVec.x * checkX + traverseVec.x * checkZ, trainY + checkY, trainZ + offsetVec.z * checkX + traverseVec.z * checkZ);
					const block = world.getDimension("overworld").getBlock(checkPos.asJson());

					// if (block instanceof BlockPlatform || block instanceof BlockPSDAPGBase) {
						if (this.openDoors_(block!, checkPos, dwellTicks)) {
							return true;
						}
						hasPlatform = true;
					// }
				}
			}
		}

		return hasPlatform;
	}

	public static isHoldingKey(player: Player): boolean {
		// return player != null && !Keys.LIFTS_ONLY && player.isHolding(Items.DRIVER_KEY.get());
        return false;
	}

	public static getAverage(a: number, b: number): number {
		return (a + b) / 2;
	}

	public static convertMaxManualSpeed(maxManualSpeed: number): RailType | undefined {
		if (maxManualSpeed >= 0 && maxManualSpeed <= RailType.DIAMOND.ordinal()) {
			return RailType.values()[maxManualSpeed];
		} else {
			return undefined;
		}
	}
}
