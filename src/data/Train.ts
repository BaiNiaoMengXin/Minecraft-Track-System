import { Block, Entity, EntityComponentTypes, EntityHealthComponent, EntityType, LocationInUnloadedChunkError, Player, RawMessage, SpawnEntityOptions, system, Vector2, Vector3, world } from "@minecraft/server";
import { TrainBase } from "./TrainBase";
import { Siding, TimeSegment } from "./Siding";
import { CollisionDetector, currentTimeMillis, EntityModelStructure } from "./Base";
import { PathData } from "path/PathData";
import { Depot } from "./Depot";
import { DataCache } from "./DataCache";
import { RailwayData } from "./RailwayData";
import { BlockPos } from "util/math/BlockPos";
import { ScheduleEntry } from "./ScheduleEntry";
import { UUID } from "jLib/UUID";
import { SignalBlocks } from "./SignalBlocks";
import { Mth } from "util/math/Mth";
import { Vec3 } from "util/math/Vec3";
import { BetterMap } from "./BetterMap";
import { TrigCache } from "TrigCache";
import { MessagePackHelper } from "./MessagePackHelper";
import { TrainModels } from "extensions/TrainModels";
import { TrainRegistry } from "extensions/TrainRegistry";
import { TrainSoundBase } from "sound/TrainSoundBase";
import { MTS } from "MTS";
import { AABB } from "util/AABB";
import { VehicleRiding } from "./VehicleRiding";
import { Route } from "./Route";
import { Station } from "./Station";
import { IGui } from "./IGui";
import { JonTrainSound } from "sound/JonTrainSound.";
import { BveTrainSound } from "sound/bve/BveTrainSound";

export class Train extends TrainBase {

    private canDeploy: boolean = false;
    private trainPositions: Array<Map<UUID, number>> | undefined;
	private oldSpeed: number = 0;
	private oldDoorValue: number = 0;

    private trainEntities: Array<Entity | undefined> = [];

    // private trainsInPlayerRange: BetterMap<Player, Set<Train>> = new EquitableMap();
    private routeId: number = 0;
    private updateRailProgressCounter: number = 0;
    private manualCoolDown: number = 0;

    private readonly timeSegments: TimeSegment[];
    private readonly trainModels: TrainModels;
    private readonly trainSound: TrainSoundBase;
    private readonly vehicleRiding: VehicleRiding = new VehicleRiding(this.ridingEntities)

    private static readonly TRAIN_UPDATE_DISTANCE: number = 96;
    private static readonly TICKS_TO_SEND_RAIL_PROGRESS: number = 40;

    public constructor(id: number, sidingId: number, railLength: number, trainId: string, baseTrainType: string, trainCars: number, path: PathData[], distances: number[], repeatIndex1: number, repeatIndex2: number, accelerationConstant: number, timeSegments: TimeSegment[], isManual: boolean, maxManualSpeed: number, manualToAutomaticTime: number);

    public constructor(
            sidingId: number, railLength: number, timeSegments: TimeSegment[],
			path: PathData[], distances: number[], repeatIndex1: number, repeatIndex2: number,
			accelerationConstant: number, isManual: boolean, maxManualSpeed: number, manualToAutomaticTime: number,
			map: Record<string, unknown>
    )

    public constructor(
            arg1: number, arg2: number, arg3: number | TimeSegment[],
			arg4: string | PathData[], arg5: string | number[], arg6: number, arg7: PathData[] | number,
			arg8: number[] | number, arg9: number | boolean, arg10: number, arg11: number,
			arg12: TimeSegment[] | Record<string, unknown>, isManual?: boolean, maxManualSpeed?: number, manualToAutomaticTime?: number
    ) {
        if (manualToAutomaticTime != undefined) {
            super(arg1, arg2, arg3 as number, arg4 as string, arg5 as string, arg6, arg7 as PathData[], arg8 as number[], arg9 as number, arg10, arg11, isManual!, maxManualSpeed!, manualToAutomaticTime);
            this.timeSegments = arg12 as TimeSegment[];
        } else {
            super(arg1, arg2, arg4 as PathData[], arg5 as number[], arg6, arg7 as number, arg8 as number, arg9 as boolean, arg10, arg11, arg12 as Record<string, unknown>)
            const messagePackHelper = new MessagePackHelper(arg12 as ReturnType<this['toMessagePack']>);
            this.timeSegments = arg3 as TimeSegment[];

            messagePackHelper.iterateArrayValue("train_entities", entityId => {
                const entity = world.getEntity(entityId.asString())
                if (entity) {
                    this.trainEntities.push(entity);
                }
            })
        }
        const trainProperties = TrainRegistry.getTrainProperties(this.trainId);
        this.trainModels = trainProperties.models;
        this.trainSound = trainProperties.sound.createTrainInstance(this);

        if (manualToAutomaticTime != undefined) {
            this.createEntities();
        }
    }

    private async createEntities() {
        const siding = MTS.railwayData.dataCache.sidingIdMap.get(this.sidingId);

        if (siding !== undefined) {
            const dimension = world.getDimension("overworld");
            let isUseTickingArea = false;
            if (!RailwayData.chunkLoaded(siding.getMidPos(true))) {
                if (this.path.length == 0) return;

                await this.path[0].rail.createTickingArea(String(this.id), dimension.id);
                isUseTickingArea = true;
            }

            for (let i = 0; i < this.trainCars; i++) {
                try {
                    const entity = dimension.spawnEntity<string>(this.trainModels.getModelFormIndex(this.trainCars, i)!, this.path[0].startingPos.asJson());
                    this.trainEntities.push(entity)
                } catch (error) {
                    this.trainEntities.push(undefined);
                    console.error(error)
                }
            }
            if (isUseTickingArea) {
                world.tickingAreaManager.removeTickingArea(String(this.id))
            }
        }
    }

    public override dispose() {
        super.dispose();
        this.trainEntities.forEach(entity => {
            if (entity !== undefined) entity.remove();
        })
        this.trainEntities.length = 0;
    }

    public override toMessagePack() {
        return {
            ...super.toMessagePack(),

            train_entities: Array.from(this.trainEntities, entity => entity?.id)
        } as const;
    }

    protected override startUp(trainCars: number, trainSpacing: number, isOppositeRail: boolean): void {
        this.canDeploy = false;
        this.isOnRoute = true;
        this.elapsedDwellTicks = 0;
        this.speed = Train.ACCELERATION_DEFAULT;
        if (isOppositeRail) {
            this.railProgress += trainCars * trainSpacing;
            this.reversed = !this.reversed;
        }
        this.nextStoppingIndex = this.getNextStoppingIndex();
        super.startUp(trainCars, trainSpacing, isOppositeRail);
    }

    protected override openDoors(): boolean {
        if (this.isCurrentlyManual) {
            return this.doorTarget;
        } else {
            if (this.transportMode.continuousMovement) {
                const index = this.getIndex(this.railProgress, false);
                if (this.path[index].dwellTime > 0 && index > 0) {
                    const doorValue1 = (this.railProgress - this.distances[index - 1]) * 0.5;
                    const doorValue2 = (this.distances[index] - this.railProgress) * 0.5;
                    return doorValue1 > 0 && (doorValue2 > doorValue1 || doorValue2 > 1);
                } else {
                    return false;
                }
            } else {
                const dwellTicks = this.path[this.nextStoppingIndex].dwellTime * 10;
                const maxDoorMoveTime = Math.min(TrainBase.DOOR_MOVE_TIME, dwellTicks / 2 - TrainBase.DOOR_DELAY);
                return this.elapsedDwellTicks >= TrainBase.DOOR_DELAY && this.elapsedDwellTicks < dwellTicks - TrainBase.DOOR_DELAY - maxDoorMoveTime;
            }
        }
    }

    protected override simulateCar(
        ridingCar: number, ticksElapsed: number,
        carX: number, carY: number, carZ: number, carYaw: number, carPitch: number,
        prevCarX: number, prevCarY: number, prevCarZ: number, prevCarYaw: number, prevCarPitch: number,
        doorLeftOpen: boolean, doorRightOpen: boolean, realSpacing: number
    ): void {
        this.vehicleRiding.mountRider(this.routeId, carX, carY, carZ, realSpacing, this.width, carYaw, carPitch, doorLeftOpen || doorRightOpen, this.isManualAllowed || doorLeftOpen || doorRightOpen, ridingCar, player => !this.isManualAllowed || doorLeftOpen || doorRightOpen || Train.isHoldingKey(player), player => {
        	if (Train.isHoldingKey(player)) {
        		this.manualCoolDown = 0;
        	}
        });

        const soundPos = { x: carX, y: carY, z: carZ };
        this.trainSound.playAllCars(soundPos, ridingCar);
        // TODO...?
        this.trainSound.playNearestCar(soundPos, ridingCar);
        if (doorLeftOpen || doorRightOpen) {
            this.trainSound.playAllCarsDoorOpening(soundPos, ridingCar);
        }

        const entity = this.trainEntities[ridingCar];
        if (entity) {
            entity?.teleport({ x: carX, y: carY, z: carZ });
            entity?.setProperty("mts:x_rotation", -Mth.toDegrees(carPitch) * 10);
            entity?.setProperty("mts:y_rotation", -Mth.toDegrees(carYaw) * 10);
            entity?.setProperty("mts:z_rotation", 0.0);
            const doorState = (this.doorValue < (this.trainSound instanceof JonTrainSound ? this.trainSound.config.doorCloseSoundTime : (this.trainSound as BveTrainSound).config.soundCfg.doorCloseSoundLength) && this.doorValue < this.oldDoorValue) ? 0 : ((doorLeftOpen ? 1 : 0) + (doorRightOpen ? 2 : 0));
            entity?.setProperty("mts:door_state", doorState);
        }
    }

    protected override handlePositions(positions: Vec3[], ticksElapsed: number): boolean {
        const trainAABB = new AABB(positions[0], positions[positions.length - 1]).inflate(Train.TRAIN_UPDATE_DISTANCE);
        const playerNearby: boolean = world.getAllPlayers().some(player => this.isPlayerRiding(player) || trainAABB.contains(player.location));

        if (ticksElapsed > 0) {
            const headIndex = this.getIndex(0, this.spacing, false);
            const stopIndex = this.path[headIndex].stopIndex - 1;

            const speed = this.speed * 20;
            const routeIds = MTS.railwayData.dataCache.sidingIdToDepot.get(this.sidingId)!.routeIds;
            let thisRoute: Route | null = null;
            let thisStation: Station | null = null;
            let nextStation: Station | null = null;
            let lastStation: Station | null = null;
            RailwayData.useRoutesAndStationsFromIndex(stopIndex, routeIds, MTS.railwayData.dataCache, (currentStationIndex, thisRoute1, nextRoute1, thisStation1, nextStation1, lastStation1) => {
				thisRoute = thisRoute1;
				thisStation = thisStation1;
				nextStation = nextStation1;
				lastStation = lastStation1;
			})

            world.getAllPlayers().forEach(player => {
                if (this.isPlayerRiding(player)) {
                    if (!this.isCurrentlyManual || !Train.isHoldingKey(player)) {
                        if (speed > 5 || thisRoute == null || thisStation == null || lastStation == null) {
                            player.onScreenDisplay.setActionBar({
                                translate: "gui.mts.vehicle_speed",
                                with: [
                                    String(RailwayData.round(speed, 1)),
                                    String(RailwayData.round(speed * 3.6, 1))
                                ]
                            });
                        } else {
                            let text: RawMessage;
                            switch (~~((system.currentTick / 20) % 3)) {
                                default:
                                    text = Train.getStationText(thisStation, "this");
                                    break;
                                case 1:
                                    if (nextStation == null) {
                                        text = Train.getStationText(thisStation, "this");
                                    } else {
                                        text = Train.getStationText(nextStation, "next");
                                    }
                                    break;
                                case 2:
                                    text = Train.getStationText(lastStation, "last_" + thisRoute.transportMode.toString().toLowerCase());
                                    break;
                            }
                            player.onScreenDisplay.setActionBar(text);
                        }
                    }


                    /* if (announcementCallback != null) {
                        final double targetProgress = distances.get(getPreviousStoppingIndex(headIndex)) + (trainCars + 1) * spacing;
                        if (oldRailProgress < targetProgress && railProgress >= targetProgress) {
                            announcementCallback.announcementCallback(stopIndex, routeIds);
                        }
                    }

                    if (lightRailAnnouncementCallback != null && (justOpening() || justMounted)) {
                        lightRailAnnouncementCallback.announcementCallback(stopIndex, routeIds);
                    } */
                }
			})

            const trainProperties = TrainRegistry.getTrainProperties(this.trainId);
            this.vehicleRiding.movePlayer(playerId => {
                const calculateCarCallback = (x: number, y: number, z: number, yaw: number, pitch: number, realSpacingRender: number, doorLeftOpenRender: boolean, doorRightOpenRender: boolean) => this.vehicleRiding.setOffsets(playerId, x, y, z, yaw, pitch, this.transportMode.maxLength == 1 ? this.spacing : realSpacingRender, this.width, doorLeftOpenRender, doorRightOpenRender, this.transportMode.hasPitchAscending, this.transportMode.hasPitchDescending, trainProperties.riderOffset, trainProperties.riderOffsetDismounting);

                const currentRidingCar = ~~Mth.clamp(Math.floor(this.vehicleRiding.getPercentageZ(playerId)), 0, positions.length - 2);
                this.calculateCar(positions, currentRidingCar, 0, (x, y, z, yaw, pitch, realSpacingRender, doorLeftOpenRender, doorRightOpenRender) => {
                    this.vehicleRiding.moveSelf(playerId, realSpacingRender, this.width, yaw, currentRidingCar, this.trainCars, doorLeftOpenRender, doorRightOpenRender, false, ticksElapsed);

                    const newRidingCar = ~~Mth.clamp(Math.floor(this.vehicleRiding.getPercentageZ(playerId)), 0, positions.length - 2);
                    if (currentRidingCar == newRidingCar) {
                        calculateCarCallback(x, y, z, yaw, pitch, realSpacingRender, doorLeftOpenRender, doorRightOpenRender);
                    } else {
                        this.calculateCar(positions, newRidingCar, 0, calculateCarCallback);
                    }
                });
            });
        }

        return playerNearby;
    }

    protected override canDeploy_(depot: Depot): boolean {
        if (this.path.length > 1 && depot != null) {
            depot.requestDeploy(this.sidingId, this);
        }
        return this.canDeploy;
    }

    protected override isRailBlocked(checkIndex: number): boolean {
        if (!this.transportMode.continuousMovement && this.trainPositions != undefined && checkIndex < this.path.length) {
        	const pathData = this.path[checkIndex];
        	const railProduct = pathData.getRailProduct();
        	for (const trainPositionsMap of this.trainPositions) {
        		if (trainPositionsMap.has(railProduct) && trainPositionsMap.get(railProduct) != this.id) {
        			return true;
        		}
        	}
        }
        return false;
    }

    protected override skipScanBlocks(trainX: number, trainY: number, trainZ: number): boolean {
        return false;
        // return world.getNearestPlayer(trainX, trainY, trainZ, MAX_CHECK_DISTANCE, entity => true) == null;
    }

    protected override openDoors_(block: Block, checkPos: Vector3, dwellTicks: number): boolean {
        // if (block instanceof BlockPSDAPGDoorBase) {
        // 	for (int i = -1; i <= 1; i++) {
        // 		final BlockPos doorPos = checkPos.above(i);
        // 		final BlockState state = world.getBlockState(doorPos);
        // 		final Block doorBlock = state.getBlock();
        // 		final BlockEntity entity = world.getBlockEntity(doorPos);

        // 		if (doorBlock instanceof BlockPSDAPGDoorBase && entity instanceof BlockPSDAPGDoorBase.TileEntityPSDAPGDoorBase && IBlock.getStatePropertySafe(state, BlockPSDAPGDoorBase.UNLOCKED)) {
        // 			final int doorStateValue = (int) Mth.clamp(doorValue * DOOR_MOVE_TIME, 0, BlockPSDAPGDoorBase.MAX_OPEN_VALUE);
        // 			((BlockPSDAPGDoorBase.TileEntityPSDAPGDoorBase) entity).setOpen(doorStateValue);

        // 			if (doorStateValue > 0 && !world.getBlockTicks().hasScheduledTick(doorPos, doorBlock)) {
        // 				/* This schedules the block tick to the door (Ensures the door will be closed when the train passes by) */
        // 				Utilities.scheduleBlockTick(world, doorPos, doorBlock, dwellTicks);
        // 			}
        // 		}
        // 	}
        // }

        // TODO: Debuging
        return true;

        // return false;
    }

    protected override asin(value: number): number {
        return TrigCache.asin(value);
    }

    public simulateTrain(ticksElapsed: number, depot: Depot, dataCache: DataCache, trainPositions: Array<BetterMap<UUID, number>>, schedulesForPlatform: Map<number, Array<ScheduleEntry>>): boolean {
        this.trainPositions = trainPositions;
        const oldStoppingIndex = this.nextStoppingIndex;
        const oldPassengerCount = this.ridingEntities.size;
        const oldIsCurrentlyManual = this.isCurrentlyManual;
        const oldStopped = this.speed == 0;
        const oldDoorOpen = this.doorTarget;
        this.oldSpeed = this.speed;
        this.oldDoorValue = this.doorValue;

        super.simulateTrain_(ticksElapsed, depot);

        const nextDepartureTicks = this.isOnRoute ? 0 : depot.getNextDepartureMillis();
        const currentMillis = currentTimeMillis() - (this.elapsedDwellTicks * Depot.MILLIS_PER_TICK) + Math.max(0, nextDepartureTicks);

        let currentTime = -1;
        let startingIndex = 0;
        for (const timeSegment of this.timeSegments) {
            if (RailwayData.isBetween(this.railProgress, timeSegment.startRailProgress, timeSegment.endRailProgress)) {
                currentTime = timeSegment.getTime(this.railProgress);
                break;
            }
            startingIndex++;
        }

        if (currentTime >= 0) {
            let offsetTime = 0;
            let offsetTimeTemp = 0;
            let secondRound = false;
            let addSchedule: (() => void) | undefined = undefined;
            this.routeId = 0;
            for (let i = startingIndex; i < this.timeSegments.length + (this.isRepeat() ? this.timeSegments.length : 0); i++) {
            	const timeSegment = this.timeSegments[i % this.timeSegments.length];

            	if (timeSegment.savedRailBaseId != 0) {
            		if (timeSegment.routeId == 0) {
            			RailwayData.useRoutesAndStationsFromIndex(this.path[this.getIndex(timeSegment.endRailProgress, true)].stopIndex - 1, depot.routeIds, dataCache, (currentStationIndex, thisRoute, nextRoute, thisStation, nextStation, lastStation) => {
            				timeSegment.routeId = thisRoute.id;
            				timeSegment.currentStationIndex = currentStationIndex;
            			});
            		}

            		const platformId = timeSegment.savedRailBaseId;
            		if (!schedulesForPlatform.has(platformId)) {
            			schedulesForPlatform.set(platformId, []);
            		}

            		if (secondRound) {
            			offsetTime = offsetTimeTemp - timeSegment.endTime;
            			secondRound = false;
            		} else if (addSchedule != undefined) {
            			addSchedule();
            		}

            		if (this.isOnRoute || nextDepartureTicks >= 0) {
            			const arrivalMillis = currentMillis + ((timeSegment.endTime + offsetTime - currentTime) * Depot.MILLIS_PER_TICK);
            			addSchedule = () => schedulesForPlatform.get(platformId)?.push(new ScheduleEntry(arrivalMillis, this.trainCars, timeSegment.routeId, timeSegment.currentStationIndex));
            			if (!this.isRepeat()) {
            				addSchedule();
            				addSchedule = undefined;
            			}
            		}

            		offsetTimeTemp = timeSegment.endTime;
            	}

            	if (this.routeId == 0) {
            		this.routeId = timeSegment.routeId;
            	}

            	if (i == this.timeSegments.length - 1) {
            		secondRound = true;
            	}
            }
        }

        this.updateRailProgressCounter++;
        if (this.updateRailProgressCounter == Train.TICKS_TO_SEND_RAIL_PROGRESS) {
            this.updateRailProgressCounter = 0;
        }

        if (this.isManualAllowed) {
            if (this.isOnRoute) {
                if (this.manualCoolDown >= this.manualToAutomaticTime * 10) {
                    if (this.isCurrentlyManual) {
                        const dwellTicks = this.nextStoppingIndex >= this.path.length ? 0 : this.path[this.nextStoppingIndex].dwellTime * 10;
                        this.elapsedDwellTicks = this.doorTarget ? dwellTicks / 2 : dwellTicks;
                    }
                    this.isCurrentlyManual = false;
                } else {
                    this.manualCoolDown++;
                    this.isCurrentlyManual = true;
                }
            } else {
                this.manualCoolDown = 0;
                this.isCurrentlyManual = true;
            }
        } else {
            this.isCurrentlyManual = false;
        }

        return oldPassengerCount > this.ridingEntities.size || oldStoppingIndex != this.nextStoppingIndex || oldIsCurrentlyManual != this.isCurrentlyManual || oldStopped && this.speed != 0 || oldDoorOpen != this.doorTarget;
    }

    public writeTrainPositions(trainPositions: Array<BetterMap<UUID, number>>, signalBlocks: SignalBlocks): void {
        if (this.path.length != 0) {
            const headIndex = this.getIndex(0, this.spacing, true);
            const tailIndex = this.getIndex(this.trainCars, this.spacing, false);
            for (let i = tailIndex; i <= headIndex; i++) {
                const pathData = this.path[i];
                if (i > 0 && pathData.savedRailBaseId != this.sidingId && pathData.rail.railType.hasSignal) {
                    signalBlocks.occupy(pathData.getRailProduct(), trainPositions, this.id);
                }
            }
        }
    }

    public deployTrain(): void {
        this.canDeploy = true;
        console.log("[Train.deployTrain]")
    }

    private getNextStoppingIndex(): number {
        const headIndex = this.getIndex(0, 0, false);
        for (let i = headIndex; i < this.path.length; i++) {
            if (this.path[i].dwellTime > 0) {
                return i;
            }
        }
        return this.path.length - 1;
    }

    private checkBlock(pos: Vec3, callback: (pos: Vec3) => void): void {
        const checkRadius = Math.floor(this.speed);
        for (let x = -checkRadius; x <= checkRadius; x++) {
            for (let z = -checkRadius; z <= checkRadius; z++) {
                for (let y = 0; y <= 3; y++) {
                    callback(pos.add(x, -y, z));
                }
            }
        }
    }

    // private static transferItems(Container inventoryFrom, Container inventoryTo) {
    // 	for (int i = 0; i < inventoryFrom.getContainerSize(); i++) {
    // 		if (!inventoryFrom.getItem(i).isEmpty()) {
    // 			final ItemStack insertItem = new ItemStack(inventoryFrom.getItem(i).getItem(), 1);
    // 			insertItem.setTag(inventoryFrom.getItem(i).getOrCreateTag());

    // 			final ItemStack remainingStack = HopperBlockEntity.addItem(null, inventoryTo, insertItem, null);
    // 			if (remainingStack.isEmpty()) {
    // 				inventoryFrom.removeItem(i, 1);
    // 				return;
    // 			}
    // 		}
    // 	}
    // }


	public speedChange() {
		return this.speed - this.oldSpeed;
	}

	public justOpening() {
		return this.oldDoorValue == 0 && this.doorValue > 0;
	}

	public justClosing(doorCloseTime: number) {
		return this.oldDoorValue >= doorCloseTime && this.doorValue < doorCloseTime;
	}


	private static getStationText(station: Station, textKey: string): RawMessage {
		if (station != null) {
			return {
                translate: "gui.mts." + textKey + "_station_cjk",
                with: {
                    rawtext: [
                        IGui.textOrUntitled(IGui.formatStationName(station.name))
                    ]
                }
            };
		} else {
			return {
                text: ""
            };
		}
	}
}
