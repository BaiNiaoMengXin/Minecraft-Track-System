import { Block, Entity, EntityComponentTypes, EntityHealthComponent, EntityType, Player, SpawnEntityOptions, system, Vector2, Vector3, world } from "@minecraft/server";
import { TrainBase } from "./TrainBase";
import { Siding, TimeSegment } from "./Siding";
import { CollisionDetector, currentTimeMillis, EntityModelStructure } from "./Base";
import { PathData } from "path/PathData";
import { Depot } from "./Depot";
import { DataCache } from "./DataCache";
import { RailwayData } from "./RailwayData";
import { TrainDelay } from "./TrainDelay";
import { BlockPos } from "util/math/BlockPos";
import { ScheduleEntry } from "./ScheduleEntry";
import { UUID } from "jLib/UUID";
import { SignalBlocks } from "./SignalBlocks";
import { Mth } from "util/math/Mth";
import { Vec3 } from "util/math/Vec3";
import { BetterMap } from "./BetterMap";
import { TrigCache } from "TrigCache";
import { MessagePackHelper } from "./MessagePackHelper";

export class Train extends TrainBase {

    private canDeploy: boolean = false;
    // private List<Map<UUID, Long>> trainPositions;

    private trainEntities: Array<Entity> = [];

    // private trainsInPlayerRange: BetterMap<Player, Set<Train>> = new EquitableMap();
    // private Map<Long, Map<BlockPos, TrainDelay>> trainDelays = new HashMap<>();
    private routeId: number = 0;
    private updateRailProgressCounter: number = 0;
    private manualCoolDown: number = 0;

    private readonly timeSegments: TimeSegment[];

    private static readonly TRAIN_UPDATE_DISTANCE: number = 128;
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

            for (let i = 0; i < this.trainCars; i++) {
                const entity = world.getDimension("overworld").spawnEntity<string>("mts:train", this.path[0].startingPos.asJson());
                entity.playAnimation("animation.train.rotation");
                this.trainEntities.push(entity);
            }
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
    }

    public override dispose() {
        super.dispose();
        system.run(() => {
            this.trainEntities.forEach(entity => entity.remove())
        })
    }

    public override toMessagePack() {
        return {
            ...super.toMessagePack(),

            train_entities: Array.from(this.trainEntities, entity => entity.id)
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
        // VehicleRidingServer.mountRider(world, ridingEntities, id, routeId, carX, carY, carZ, realSpacing, width, carYaw, carPitch, doorLeftOpen || doorRightOpen, isManualAllowed || doorLeftOpen || doorRightOpen, ridingCar, PACKET_UPDATE_TRAIN_PASSENGERS, player -> !isManualAllowed || doorLeftOpen || doorRightOpen || Train.isHoldingKey(player), player -> {
        // 	if (isHoldingKey(player)) {
        // 		manualCoolDown = 0;
        // 	}
        // });

        //////////////////////////////////////
        const entity = this.trainEntities[ridingCar];

        entity?.teleport({ x: carX, y: carY, z: carZ });
        entity?.setProperty("mts:x_rotation", -Mth.toDegrees(carPitch));
        entity?.setProperty("mts:y_rotation", -Mth.toDegrees(carYaw));
        entity?.setProperty("mts:z_rotation", 0.0);

        // HandlePlayerRiding
        for (const [player, data] of this.ridingEntities) {
            if (!player) {
                this.removeRidingPlayer(player);
                continue;
            }
            if (data.ridingCar != ridingCar) {
                continue;
            }

            // 获取玩家输入
            const move: Vector2 = player.inputInfo.getMovementVector?.() || { x: 0, y: 0 };

            // 只在玩家有输入时更新偏移量
            if (move.x !== 0 || move.y !== 0) {
                const SPEED = 0.2;
                const playerRotation = player.getRotation();
                let offset = new Vec3(Math.sign(-move.y) * SPEED, 0, Math.sign(move.x) * SPEED)
                let offset2 = (offset.yRot_Degrees(-playerRotation.y + 90)).yRot(carYaw);
                data.offsets.z += offset2.z;
                data.offsets.x += offset2.x;
            }

            const newRidingPos: Vec3 = new Vec3(carX, carY, carZ).add(data.offsets.yRot(-carYaw));

            data.carrier.teleport(newRidingPos)
        }

        for (const player of world.getAllPlayers()) {
            const model: EntityModelStructure = {
                position: { x: carX, y: carY + 3 / 2, z: carZ },
                rotation: { x: carPitch, y: -carYaw },
                size: { x: 3, y: 3, z: this.spacing + this.width }
            };

            const isColliding = CollisionDetector.isPlayerCollidingWithModel(player, model);
            if (isColliding && !this.isPlayerRiding(player)) {
                this.addRidingPlayer(
                    ridingCar, player,
                    carX, carY, carZ,
                    carYaw, carPitch
                );
            } else if (!isColliding && this.isPlayerRiding(player) && this.ridingEntities.get(player)?.ridingCar == ridingCar) {


                // const model2: EntityModelStructure = {
                //     position: { x: pos.x, y: pos.y + 3 / 2, z: pos.z},
                //     rotation: { x: rot.x, y: -rot.y },
                //     size: { x: 3.1, y: 3, z: this.spacing + this.width }
                // };
                // const isColliding2 = CollisionDetector.isPlayerCollidingWithModel(player, model2);

                // if (!isColliding2)
                // {
                this.removeRidingPlayer(player);
                // }
            }
        }

        for (const entity of this.trainEntities.values()) {
            (entity.getComponent(EntityComponentTypes.Health) as EntityHealthComponent).setCurrentValue(9999)
        }
        for (const data of this.ridingEntities.values()) {
            (data.carrier.getComponent(EntityComponentTypes.Health) as EntityHealthComponent).setCurrentValue(9999)
        }
    }

    protected override handlePositions(positions: Vec3[], ticksElapsed: number): boolean {
        // final AABB trainAABB = new AABB(positions[0], positions[positions.length - 1]).inflate(TRAIN_UPDATE_DISTANCE);
        let playerNearby: boolean[] = [false];
        // world.players().forEach(player -> {
        // 	if (isPlayerRiding(player) || trainAABB.contains(player.position())) {
        // 		if (!trainsInPlayerRange.containsKey(player)) {
        // 			trainsInPlayerRange.put(player, new HashSet<>());
        // 		}
        // 		trainsInPlayerRange.get(player).add(this);
        // 		playerNearby[0] = true;
        // 	}
        // });

        // final BlockPos frontPos = RailwayData.newBlockPos(positions[reversed ? positions.length - 1 : 0]);
        // if (RailwayData.chunkLoaded(world, frontPos)) {
        // 	checkBlock(frontPos, checkPos -> {
        // 		if (RailwayData.chunkLoaded(world, checkPos)) {
        // 			final BlockState state = world.getBlockState(checkPos);
        // 			final Block block = state.getBlock();

        // 			if (block instanceof BlockTrainRedstoneSensor && BlockTrainSensorBase.matchesFilter(world, checkPos, routeId, speed)) {
        // 				((BlockTrainRedstoneSensor) block).power(world, state, checkPos);
        // 			}

        // 			if ((block instanceof BlockTrainCargoLoader || block instanceof BlockTrainCargoUnloader) && BlockTrainSensorBase.matchesFilter(world, checkPos, routeId, speed)) {
        // 				for (final Direction direction : Direction.values()) {
        // 					final Container nearbyInventory = HopperBlockEntity.getContainerAt(world, checkPos.relative(direction));
        // 					if (nearbyInventory != null) {
        // 						if (block instanceof BlockTrainCargoLoader) {
        // 							transferItems(nearbyInventory, inventory);
        // 						} else {
        // 							transferItems(inventory, nearbyInventory);
        // 						}
        // 					}
        // 				}
        // 			}
        // 		}
        // 	});
        // }

        // if (!ridingEntities.isEmpty() && RailwayData.chunkLoaded(world, frontPos)) {
        // 	checkBlock(frontPos, checkPos -> {
        // 		if (RailwayData.chunkLoaded(world, checkPos) && world.getBlockState(checkPos).getBlock() instanceof BlockTrainAnnouncer) {
        // 			final BlockEntity entity = world.getBlockEntity(checkPos);
        // 			if (entity instanceof BlockTrainAnnouncer.TileEntityTrainAnnouncer && ((BlockTrainAnnouncer.TileEntityTrainAnnouncer) entity).matchesFilter(routeId, speed)) {
        // 				ridingEntities.forEach(uuid -> ((BlockTrainAnnouncer.TileEntityTrainAnnouncer) entity).announce(world.getPlayerByUUID(uuid)));
        // 			}
        // 		}
        // 	});
        // }

        return true;
    }

    protected override canDeploy_(depot: Depot): boolean {
        if (this.path.length > 1 && depot != null) {
            depot.requestDeploy(this.sidingId, this);
        }
        return this.canDeploy;
    }

    protected override isRailBlocked(checkIndex: number): boolean {
        // if (!this.transportMode.continuousMovement && this.trainPositions != null && checkIndex < this.path.size()) {
        // 	const pathData = this.path.get(checkIndex);
        // 	const railProduct = pathData.getRailProduct();
        // 	for (const trainPositionsMap of this.trainPositions) {
        // 		if (trainPositionsMap.containsKey(railProduct) && trainPositionsMap.get(railProduct) != id) {
        // 			if (routeId != 0) {
        // 				if (!trainDelays.containsKey(routeId)) {
        // 					trainDelays.put(routeId, new HashMap<>());
        // 				}
        // 				if (!trainDelays.get(routeId).containsKey(pathData.startingPos)) {
        // 					trainDelays.get(routeId).put(pathData.startingPos, new TrainDelay());
        // 				}
        // 				trainDelays.get(routeId).get(pathData.startingPos).delaying();
        // 			}
        // 			return true;
        // 		}
        // 	}
        // }
        return false;
    }

    protected override skipScanBlocks(trainX: number, trainY: number, trainZ: number): boolean {
        return false;
        // return world.getNearestPlayer(trainX, trainY, trainZ, MAX_CHECK_DISTANCE, entity -> true) == null;
    }

    protected override openDoors_(block: Block, checkPos: BlockPos, dwellTicks: number): boolean {
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

        return false;
    }

    protected override asin(value: number): number {
        return TrigCache.asin(value);
    }

    public simulateTrain(ticksElapsed: number, depot: Depot, dataCache: DataCache, trainPositions: Map<UUID, bigint>[], schedulesForPlatform: Map<number, Array<ScheduleEntry>>, trainDelays: Map<number, BetterMap<BlockPos, TrainDelay>>): boolean {
        // this.trainPositions = trainPositions;
        // this.trainsInPlayerRange = trainsInPlayerRange;
        // this.trainDelays = trainDelays;
        const oldStoppingIndex = this.nextStoppingIndex;
        const oldPassengerCount = this.ridingEntities.size;
        const oldIsCurrentlyManual = this.isCurrentlyManual;
        const oldStopped = this.speed == 0;
        const oldDoorOpen = this.doorTarget;

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
            const offsetTime = 0;
            const offsetTimeTemp = 0;
            const secondRound = false;
            // Runnable addSchedule = null;
            // routeId = 0;
            // for (int i = startingIndex; i < timeSegments.size() + (isRepeat() ? timeSegments.size() : 0); i++) {
            // 	final Siding.TimeSegment timeSegment = timeSegments.get(i % timeSegments.size());

            // 	if (timeSegment.savedRailBaseId != 0) {
            // 		if (timeSegment.routeId == 0) {
            // 			RailwayData.useRoutesAndStationsFromIndex(path.get(getIndex(timeSegment.endRailProgress, true)).stopIndex - 1, depot.routeIds, dataCache, (currentStationIndex, thisRoute, nextRoute, thisStation, nextStation, lastStation) -> {
            // 				timeSegment.routeId = thisRoute == null ? 0 : thisRoute.id;
            // 				timeSegment.currentStationIndex = currentStationIndex;
            // 			});
            // 		}

            // 		final long platformId = timeSegment.savedRailBaseId;
            // 		if (!schedulesForPlatform.containsKey(platformId)) {
            // 			schedulesForPlatform.put(platformId, new ArrayList<>());
            // 		}

            // 		if (secondRound) {
            // 			offsetTime = offsetTimeTemp - timeSegment.endTime;
            // 			secondRound = false;
            // 		} else if (addSchedule != null) {
            // 			addSchedule.run();
            // 		}

            // 		if (isOnRoute || nextDepartureTicks >= 0) {
            // 			final long arrivalMillis = currentMillis + (long) ((timeSegment.endTime + offsetTime - currentTime) * Depot.MILLIS_PER_TICK);
            // 			addSchedule = () -> schedulesForPlatform.get(platformId).add(new ScheduleEntry(arrivalMillis, trainCars, timeSegment.routeId, timeSegment.currentStationIndex));
            // 			if (!isRepeat()) {
            // 				addSchedule.run();
            // 				addSchedule = null;
            // 			}
            // 		}

            // 		offsetTimeTemp = timeSegment.endTime;
            // 	}

            // 	if (routeId == 0) {
            // 		routeId = timeSegment.routeId;
            // 	}

            // 	if (i == timeSegments.size() - 1) {
            // 		secondRound = true;
            // 	}
            // }
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

    public removeRidingPlayer(player: Player): void {
        const carrier = this.ridingEntities.get(player)?.carrier;
        if (carrier) {
            carrier.remove();
        }
        this.ridingEntities.delete(player);
    }

    public addRidingPlayer(ridingCar: number, player: Player,
        carX: number, carY: number, carZ: number, carYaw: number, carPitch: number,
    ): void {
        if (this.isPlayerRiding(player)) return;


        const playerPos = Vec3.fromVector3(player.location);

        playerPos.y = carY + 0.3;

        const carrier = world.getDimension("overworld").spawnEntity<string>("mts:transparent_carrier", playerPos);
        carrier.getComponent("rideable")?.addRider(player);

        // 计算玩家相对于车厢的局部坐标（考虑旋转）
        const worldOffset = playerPos.subtract(new Vec3(carX, carY, carZ));

        const localOffset = worldOffset.yRot(carYaw).xRot(carPitch);

        this.ridingEntities.set(player, {
            carrier: carrier,
            ridingCar: ridingCar,
            offsets: localOffset  // 使用局部坐标偏移
        });
    }
}
