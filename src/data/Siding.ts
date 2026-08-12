import { PathData } from "path/PathData";
import { NameColorDataBase } from "./NameColorDataBase";
import { TransportMode } from "./TransportMode";
import { BetterMap } from "./BetterMap";
import { generateUniqueNumberID } from "./Base";
import { Rail } from "./Rail";
import { Platform } from "./Platform";
import { SavedRailBase } from "./SavedRailBase";
import { PathFinder } from "path/PathFinder";
import { Depot } from "./Depot";
import { DataCache } from "./DataCache";
import { RailwayData } from "./RailwayData";
import { Train } from "./Train";
import { BlockPos } from "util/math/BlockPos";
import { TrainType } from "./TrainType";
import { Player, system } from "@minecraft/server";
import { ScheduleEntry } from "./ScheduleEntry";
import { SignalBlocks } from "./SignalBlocks";
import { ArrayList } from "jLib/ArrayList";
import { RailType } from "./RailType";
import { IReducedSaveData } from "./IReducedSaveData";
import { Integer } from "jLib/Math";
import { MessagePackHelper } from "./MessagePackHelper";
import { UUID } from "jLib/UUID";
import { MTS } from "MTS";
import { IDispose } from "util/IDispose";
import { Config } from "Config";

export class Siding extends SavedRailBase implements IReducedSaveData, IDispose {

	private depot: Depot | null = null;
	private trainId: string = "";
	private baseTrainType: string = "";
	private trainCars: number = 0;
	private unlimitedTrains: boolean;
	private maxTrains: number = 0;
	private isManual: boolean = false;
	private maxManualSpeed: number = 0;
	private repeatIndex1: number = 0;
	private repeatIndex2: number = 0;
	private accelerationConstant: number;

	public readonly railLength: number = 0;
    private readonly path: PathData[] = [];
    private readonly distances: number[] = [];
    private readonly timeSegments: TimeSegment[] = [];
    private readonly platformTimes: Map<number, Map<number, number>> = new Map()
    private readonly trains: ArrayList<Train> = new ArrayList();

    public constructor(id: number, transportMode: TransportMode, pos1: BlockPos, pos2: BlockPos, railLength: number);

    public constructor(transportMode: TransportMode, pos1: BlockPos, pos2: BlockPos, railLength: number);

    public constructor(map: Record<string, unknown>);

    public constructor(arg1: Record<string, unknown> | TransportMode | number, arg2?: BlockPos | TransportMode, arg3?: BlockPos, arg4?: number | BlockPos, arg5?: number) {
        if (typeof arg1 == "number") {
			const transportMode = arg2 as TransportMode
			super(arg1, transportMode, arg3 as BlockPos, arg4 as BlockPos);
			this.railLength = RailwayData.round(arg5!, 3)
			this.setTrainDelails();
			this.unlimitedTrains = transportMode.continuousMovement;
			this.accelerationConstant = transportMode.continuousMovement ? Train.MAX_ACCELERATION : Train.ACCELERATION_DEFAULT;
		} else if (arg1 instanceof TransportMode) {
			const transportMode = arg1;
			super(transportMode, arg2 as BlockPos, arg3 as BlockPos);
			this.railLength = RailwayData.round(arg4 as number, 3)
			this.setTrainDelails();
			this.unlimitedTrains = transportMode.continuousMovement;
			this.accelerationConstant = transportMode.continuousMovement ? Train.MAX_ACCELERATION : Train.ACCELERATION_DEFAULT
		} else {
			super(arg1 as Record<string, unknown>);
			const messagePackHelper = new MessagePackHelper(arg1 as ReturnType<this['toMessagePack']>);
            this.railLength = RailwayData.round(messagePackHelper.getDouble("rail_length"), 3);
            this.setTrainDelails(messagePackHelper.getString("train_id"), messagePackHelper.getString("base_train_type"), false);
			this.unlimitedTrains = this.transportMode.continuousMovement || messagePackHelper.getBoolean("unlimited_trains");
			this.maxTrains = messagePackHelper.getInt("max_trains");
			this.maxManualSpeed = messagePackHelper.getInt("max_manual_speed");
			this.repeatIndex1 = messagePackHelper.getInt("repeat_index_1");
			this.repeatIndex2 = messagePackHelper.getInt("repeat_index_2");
            const tempAccelerationConstant = RailwayData.round(messagePackHelper.getDouble("acceleration_constant", Train.ACCELERATION_DEFAULT), 3);
            this.accelerationConstant = this.transportMode.continuousMovement ? Train.MAX_ACCELERATION : tempAccelerationConstant ? Train.ACCELERATION_DEFAULT : tempAccelerationConstant <= 0 ? Train.ACCELERATION_DEFAULT : tempAccelerationConstant;
			
			messagePackHelper.iterateArrayValue("path", pathSection => this.path.push(new PathData(pathSection.asRecordValue())));

			this.generateTimeSegments(this.path, this.timeSegments, this.platformTimes);

			messagePackHelper.iterateArrayValue("trains", value => this.trains.push(new Train(this.id, this.railLength, this.timeSegments, this.path, this.distances, this.repeatIndex1, this.repeatIndex2, this.accelerationConstant, this.isManual, this.maxManualSpeed, this.dwellTime, value.asRecordValue())));
			this.generateDistances();
        }
    }

    public override toMessagePack() {
        return {
            ...this.toReducedMessagePack(),
            trains: Array.from(this.trains, data => data.toMessagePack())
        } as const;
    }

	public toReducedMessagePack() {
		return {
			...super.toMessagePack(),

            rail_length: this.railLength,
            train_id: this.trainId,
            base_train_type: this.baseTrainType,
			unlimited_trains: this.unlimitedTrains,
			max_trains: this.maxTrains,
            max_manual_speed: this.maxManualSpeed,
			repeat_index_1: this.repeatIndex1,
			repeat_index_2: this.repeatIndex2,
            acceleration_constant: this.accelerationConstant,
			path: Array.from(this.path, data => data.toMessagePack())
		} as const;
	}

	public dispose(): void {
		this.clearTrains();
	}

	public setUnlimitedTrains(unlimitedTrains: boolean, maxTrains: number, isManual: boolean, maxManualSpeed: number, accelerationConstant: number, newDwellTime: number, clearTrains: boolean): void {
		const tempAccelerationConstant = RailwayData.round(accelerationConstant, 3);
		this.unlimitedTrains = this.transportMode.continuousMovement || unlimitedTrains;
		this.maxTrains = maxTrains;
		this.isManual = isManual;
		this.maxManualSpeed = maxManualSpeed;
		this.accelerationConstant = this.transportMode.continuousMovement ? Train.MAX_ACCELERATION : tempAccelerationConstant;
		if (clearTrains) {
			this.clearTrains();
		}
	}

    public getTrainId(): string {
        return this.trainId;
    }

    public getAccelerationConstant(): number {
        return this.accelerationConstant;
    }

    public setSidingData(depot: Depot | null, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>): void {
        this.depot = depot;

        if (depot == null) {
			this.clearTrains();
            this.path.length = 0;
            this.distances.length = 0;
        } else {
            if (this.path.length == 0) {
                this.generateDefaultPath(rails);
                this.generateDistances();
            }
            depot.platformTimes.clear();
            for (let [key, value] of this.platformTimes) {
                depot.platformTimes.set(key, value);
            }
        }
    }

    public generateRoute(mainPath: PathData[], successfulSegmentsMain: number, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, firstPlatform: SavedRailBase | null, lastPlatform: SavedRailBase | null, repeatInfinitely: boolean, cruisingAltitude: number, useFastSpeed: boolean): number {
        const tempPath: PathData[] = [];
		let successfulSegments: number;
		let tempRepeatIndex1: number;
		let tempRepeatIndex2: number;

		if (firstPlatform == null || lastPlatform == null) {
			successfulSegments = 0;
			tempRepeatIndex1 = 0;
			tempRepeatIndex2 = 0;
		} else {
			const depotAndFirstPlatform: SavedRailBase[] = [];
			depotAndFirstPlatform.push(this);
			depotAndFirstPlatform.push(firstPlatform);
			PathFinder.findPath(tempPath, rails, depotAndFirstPlatform, 0, cruisingAltitude, useFastSpeed);

			if (tempPath.length == 0) {
				successfulSegments = 1;
				tempRepeatIndex1 = 0;
				tempRepeatIndex2 = 0;
			} else if (mainPath.length == 0) {
				tempPath.length = 0;
				successfulSegments = successfulSegmentsMain + 1;
				tempRepeatIndex1 = 0;
				tempRepeatIndex2 = 0;
			} else {
				tempRepeatIndex1 = repeatInfinitely ? tempPath.length - (tempPath[tempPath.length - 1].isOppositeRail(mainPath[0]) ? 0 : 1) : 0;
				PathFinder.appendPath(tempPath, mainPath);

				const lastPlatformAndDepot: SavedRailBase[] = [];
				lastPlatformAndDepot.push(lastPlatform);
				lastPlatformAndDepot.push(this);
				const pathLastPlatformToDepot: PathData[] = [];
				PathFinder.findPath(pathLastPlatformToDepot, rails, lastPlatformAndDepot, successfulSegmentsMain, cruisingAltitude, useFastSpeed);

				if (pathLastPlatformToDepot.length == 0) {
					successfulSegments = successfulSegmentsMain + 1;
					tempPath.length = 0;
					tempRepeatIndex2 = 0;
				} else {
					tempRepeatIndex2 = repeatInfinitely ? tempPath.length - 1 : 0;
					PathFinder.appendPath(tempPath, pathLastPlatformToDepot);
					successfulSegments = successfulSegmentsMain + 2;
				}
			}
		}

		const tempTimeSegments: TimeSegment[] = [];
		const tempPlatformTimes: Map<number, Map<number, number>>  = new Map();
		this.generateTimeSegments(tempPath, tempTimeSegments, tempPlatformTimes);

		(async() => {
            this.path.length = 0;
            if (tempPath.length == 0) {
                this.generateDefaultPath(rails);
            } else {
                this.path.push(...tempPath);
            }

            this.timeSegments.length = 0;
            this.timeSegments.push(...tempTimeSegments);
            this.platformTimes.clear();
            for (const [key, value] of tempPlatformTimes) {
                this.platformTimes.set(key, value);
            }
            this.generateDistances();

            if (tempRepeatIndex1 != this.repeatIndex1 || tempRepeatIndex2 != this.repeatIndex2) {
                this.clearTrains();
            }

            this.repeatIndex1 = tempRepeatIndex1;
            this.repeatIndex2 = tempRepeatIndex2;
		})();

		return successfulSegments;
    }

	public simulateTrain(dataCache: DataCache, trainPositions: Array<BetterMap<UUID, number>>, signalBlocks: SignalBlocks, schedulesForPlatform: Map<number, Array<ScheduleEntry>>): void {
		if (this.depot == null) {
			return;
		}

		let trainsAtDepot = 0;
		let spawnTrain = true;

		const railProgressSet: number[] = [];
		const trainsToRemove: Train[] = [];
		for (const train of this.trains) {
			const isInvalid = train.getIsInvalid();
			if (isInvalid && system.currentTick % Config.ticksElapsedIfTrainInvaild != 0) {
				continue;
			}

			if (train.isCurrentlyManual_() && MTS.railwayData.railwayDataDriveTrainModule.drive(train)) {
				// trainsToSync.push(train);
			}

			if (train.simulateTrain(isInvalid ? Config.ticksElapsedIfTrainInvaild : 1, this.depot, dataCache, trainPositions, schedulesForPlatform)) {
				// trainsToSync.push(train);
			}

			if (train.closeToDepot(train.spacing * this.trainCars)) {
				spawnTrain = false;
			}

			if (!train.getIsOnRoute()) {
				trainsAtDepot++;
				if (trainsAtDepot > 1) {
					trainsToRemove.push(train);
				}
			}

			const roundedRailProgress = Math.round(train.getRailProgress() * 10);
			if (railProgressSet.includes(roundedRailProgress)) {
				trainsToRemove.push(train);
			}
			railProgressSet.push(roundedRailProgress);

			if (trainPositions != null && !this.transportMode.continuousMovement) {
				train.writeTrainPositions(trainPositions, signalBlocks);
			}
		}

		if (this.trainCars > 0 && (this.trains.isEmpty() || spawnTrain && (this.unlimitedTrains || this.trains.length <= this.maxTrains))) {
			const train = new Train(this.unlimitedTrains || this.maxTrains > 0 ? generateUniqueNumberID() : this.id, this.id, this.railLength, this.trainId, this.baseTrainType, this.trainCars, this.path, this.distances, this.repeatIndex1, this.repeatIndex2, this.accelerationConstant, this.timeSegments, this.isManual, this.maxManualSpeed, this.dwellTime);
			this.trains.push(train);
		}

		if (trainsToRemove.length != 0) {
			trainsToRemove.forEach(item => {
				if (this.trains.remove(item)) {
					item.dispose();
				}
			});
		}
	}

    public isValidVehicle(spacing: number): boolean {
        return Math.max(2, this.railLength) >= spacing;
    }

	public getMaxTrains(): number {
		return this.maxTrains;
	}

	public getIsManual(): boolean {
		return this.isManual;
	}

	public getMaxManualSpeed(): number {
		return this.maxManualSpeed;
	}

	public getUnlimitedTrains(): boolean {
		return this.unlimitedTrains;
	}

	public clearTrains(): void {
		this.trains.forEach(train => train.dispose());
		this.trains.clear();
	}

    public setTrainDelails(): void;

    public setTrainDelails(trainId: string, baseTrainType: string, force: boolean): void;

    public setTrainDelails(trainId?: string, baseTrainType?: string, force?: boolean): void {
        if (trainId == undefined || baseTrainType == undefined || force === undefined) {
            for (const trainType of TrainType.values()) {
                if (TrainType.getTransportMode(trainType.baseTrainType) == this.transportMode && this.isValidVehicle(TrainType.getSpacing(trainType.baseTrainType)))
                {
                    this.setTrainDelails(trainType.toString(), trainType.baseTrainType, true);
                    return;
                }
            }
            this.setTrainDelails(TrainType.values()[0].toString(), TrainType.values()[0].baseTrainType, true);
        } else {
            // TODO temporary code for backwards compatibility
            const baseTrainType2 = baseTrainType.startsWith("base_") ? baseTrainType.replace("base_", "train_") : baseTrainType;
            // TODO temporary code end
            const trainSpacing = TrainType.getSpacing(baseTrainType2);
            if (force || this.isValidVehicle(trainSpacing)) {
                this.baseTrainType = baseTrainType2.toLowerCase();
                this.trainId = trainId == "" ? this.baseTrainType : trainId.toLowerCase();
                this.trainCars = Math.min(this.transportMode.maxLength, Math.floor(this.railLength / trainSpacing));
            }      
        }
    }

	private generateDefaultPath(rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>): void {
		this.clearTrains();

		const orderedPositions = this.getOrderedPositions(RailwayData.newBlockPos(0, 0, 0), false);
		const pos1 = orderedPositions[0];
		const pos2 = orderedPositions[1];
		if (RailwayData.containsRail(rails, pos1, pos2)) {
			this.path.push(new PathData(rails.get(pos1)!.get(pos2)!, this.id, 0, pos1, pos2, -1));
		}

		this.trains.push(new Train(this.id, this.id, this.railLength, this.trainId, this.baseTrainType, this.trainCars, this.path, this.distances, this.repeatIndex1, this.repeatIndex2, this.accelerationConstant, this.timeSegments, this.isManual, this.maxManualSpeed, this.dwellTime));
	}

	private generateDistances(): void {
		this.distances.length = 0;

		let distanceSum = 0;
		for (const pathData of this.path) {
			distanceSum += pathData.rail.getLength();
			this.distances.push(distanceSum);
		}

		if (this.path.length != 1) {
			this.trains.removeIf(train => {
				if ((train.id == this.id) == this.unlimitedTrains) {
					train.dispose();
					return true;
				}
				return false;
			});
		}
	}

	private generateTimeSegments(path: PathData[], timeSegments: TimeSegment[], platformTimes: Map<number, Map<number, number>>): void {
		timeSegments.length = 0;

		let distanceSum1 = 0;
		const stoppingDistances = new ArrayList<number>();
		for (const pathData of this.path) {
			distanceSum1 += pathData.rail.getLength();
			if (pathData.dwellTime > 0) {
				stoppingDistances.push(distanceSum1);
			}
		}

		let spacing = TrainType.getSpacing(this.baseTrainType);
		let railProgress = (this.railLength + this.trainCars * spacing) / 2;
		let nextStoppingDistance = 0;
		let speed = 0;
		let time = 0;
		let timeOld = 0;
		let savedRailBaseIdOld = 0;
		let distanceSum2 = 0;
		for (let i = 0; i < path.length; i++) {
			if (railProgress >= nextStoppingDistance) {
				if (stoppingDistances.length == 0) {
					nextStoppingDistance = distanceSum1;
				} else {
					nextStoppingDistance = stoppingDistances.remove(0);
				}
			}

			const pathData = path[i];
			const railSpeed = pathData.rail.railType.canAccelerate ? pathData.rail.railType.maxBlocksPerTick : Math.max(speed, RailType.getDefaultMaxBlocksPerTick(this.transportMode));
			distanceSum2 += pathData.rail.getLength();

			while (railProgress < distanceSum2) {
				let speedChange: number;
				if (speed > railSpeed || nextStoppingDistance - railProgress + 1 < 0.5 * speed * speed / this.accelerationConstant) {
					speed = Math.max(speed - this.accelerationConstant, this.accelerationConstant);
					speedChange = -1;
				} else if (speed < railSpeed) {
					speed = Math.min(speed + this.accelerationConstant, railSpeed);
					speedChange = 1;
				} else {
					speedChange = 0;
				}

				if (timeSegments.length == 0 || timeSegments[timeSegments.length - 1].speedChange != speedChange) {
					timeSegments.push(new TimeSegment(railProgress, speed, time, speedChange, this.accelerationConstant));
				}

				railProgress = Math.min(railProgress + speed, distanceSum2);
				time++;

				const timeSegment = timeSegments[timeSegments.length - 1];
				timeSegment.endRailProgress = railProgress;
				timeSegment.endTime = time;
				timeSegment.savedRailBaseId = nextStoppingDistance != distanceSum1 && railProgress == distanceSum2 && pathData.dwellTime > 0 ? pathData.savedRailBaseId : 0;
			}

			time += pathData.dwellTime * 5;

			if (pathData.savedRailBaseId != 0) {
				if (savedRailBaseIdOld != 0) {
					if (!platformTimes.has(savedRailBaseIdOld)) {
						platformTimes.set(savedRailBaseIdOld, new Map());
					}
					platformTimes.get(savedRailBaseIdOld)!.set(pathData.savedRailBaseId, time - timeOld);
				}
				savedRailBaseIdOld = pathData.savedRailBaseId;
				timeOld = time;
			}

			time += pathData.dwellTime * 5;

			if (i + 1 < path.length && pathData.isOppositeRail(path[i + 1])) {
				railProgress += spacing * this.trainCars;
			}
		}
	}

	public getTrainIterators() {
		return this.trains[Symbol.iterator]();
	}
}

export class TimeSegment {

	public endRailProgress: number = 0;
	public savedRailBaseId: number = 0;
	public routeId: number = 0;
	public currentStationIndex: number = 0;
	public endTime: number = 0;

	public readonly startRailProgress: number;
	private readonly startSpeed: number;
	private readonly startTime: number;
	public readonly speedChange: number;
	private readonly accelerationConstant: number;

	public constructor(startRailProgress: number, startSpeed: number, startTime: number, speedChange: number, accelerationConstant: number) {
		this.startRailProgress = startRailProgress;
		this.startSpeed = startSpeed;
		this.startTime = startTime;
		this.speedChange = Integer.compare(speedChange, 0);
		const tempAccelerationConstant = RailwayData.round(accelerationConstant, 3);
		this.accelerationConstant = tempAccelerationConstant <= 0 ? Train.ACCELERATION_DEFAULT : tempAccelerationConstant;
	}

	public getTime(railProgress: number): number {
		const distance = railProgress - this.startRailProgress;
		if (this.speedChange == 0) {
			return this.startTime + distance / this.startSpeed;
		} else {
			const acceleration = this.speedChange * this.accelerationConstant;
			return this.startTime + (distance == 0 ? 0 : (Math.sqrt(2 * acceleration * distance + this.startSpeed * this.startSpeed) - this.startSpeed) / acceleration);
		}
	}
}