import { Direction } from "util/math/Direction";
import { NameColorDataBase } from "./NameColorDataBase";
import { BlockComponent, BlockComponentTypes, Entity, world } from "@minecraft/server";
import { BlockPos } from "util/math/BlockPos";
import { LiftInstructions } from "./LiftInstructions";
import { MessagePackHelper } from "./MessagePackHelper";
import { ArrayList } from "jLib/ArrayList";
import { RailwayData } from "./RailwayData";
import { Train } from "./Train";
import { Mth } from "util/math/Mth";
import { BlockLiftTrackFloor } from "block/BlockLiftTrackFloor";

export class LiftDirection {
	static readonly NONE = new LiftDirection(0);
	static readonly UP = new LiftDirection(1);
	static readonly DOWN = new LiftDirection(-1);

	readonly speedMultiplier: number;

	private constructor(speedMultiplier: number) {
		this.speedMultiplier = speedMultiplier;
	}
}

export class LiftStyle {
	private static readonly $VALUES: Array<LiftStyle> = [];

	static readonly TRANSPARENT = new LiftStyle("TRANSPARENT");
	static readonly OPAQUE = new LiftStyle("OPAQUE");

	private readonly $NAME: string;

	private constructor($NAME: string) {
		this.$NAME = $NAME

		LiftStyle.$VALUES.push(this);
	}

	public ordinal() {
		return LiftStyle.$VALUES.indexOf(this);
	}

	public static valueOf(str: string) {
		return this.$VALUES.find(liftStyle => liftStyle.$NAME == str);
	}

	public static values(): ReadonlyArray<LiftStyle> {
		return this.$VALUES;
	}

	public next(): LiftStyle {
		return LiftStyle.$VALUES[(this.ordinal() + 1) % LiftStyle.$VALUES.length];
	}
};


export abstract class LiftBase extends NameColorDataBase {

	public liftHeight: number;
	public liftWidth: number;
	public liftDepth: number;
	public liftOffsetX: number;
	public liftOffsetY: number;
	public liftOffsetZ: number;
	public isDoubleSided: boolean;
	public liftStyle: LiftStyle;
	public facing: Direction;

	protected currentPositionX: number;
	protected currentPositionY: number;
	protected currentPositionZ: number;
	protected liftDirection = LiftDirection.NONE;
	protected speed: number = 0;
	protected doorOpen = true;
	protected doorValue: number = 0;
	protected frontCanOpen: boolean = false;
	protected backCanOpen: boolean = false;

	public readonly liftInstructions: LiftInstructions;
	public readonly floors = new ArrayList<BlockPos>;
	protected readonly ridingEntities: Map<string, Entity> = new Map();

	public static readonly DOOR_MAX = 24;

	public constructor(pos: BlockPos, facing: Direction);
	public constructor(map: Record<string, unknown>);

	public constructor(arg1: BlockPos | Record<string, unknown>, facing?: Direction) {
		if (facing !== undefined) {
			super();
			this.liftHeight = 4;
			this.liftWidth = 2;
			this.liftDepth = 2;
			this.liftOffsetX = 0;
			this.liftOffsetY = 0;
			this.liftOffsetZ = 0;
			this.isDoubleSided = false;
			this.liftStyle = LiftStyle.TRANSPARENT;
			this.facing = facing;
			this.currentPositionX = (arg1 as BlockPos).getX();
			this.currentPositionY = (arg1 as BlockPos).getY();
			this.currentPositionZ = (arg1 as BlockPos).getZ();

		} else {
			super(arg1 as Record<string, unknown>);
			const messagePackHelper = new MessagePackHelper(arg1 as ReturnType<this['toMessagePack']>);

			this.liftHeight = messagePackHelper.getInt("lift_height");
			this.liftWidth = messagePackHelper.getInt("lift_width");
			this.liftDepth = messagePackHelper.getInt("lift_depth");
			this.liftOffsetX = messagePackHelper.getInt("lift_offset_x");
			this.liftOffsetY = messagePackHelper.getInt("lift_offset_y");
			this.liftOffsetZ = messagePackHelper.getInt("lift_offset_z");
			this.isDoubleSided = messagePackHelper.getBoolean("is_double_sided");
			this.liftStyle = LiftStyle.valueOf(messagePackHelper.getString("lift_style")) ?? LiftStyle.TRANSPARENT;
			this.facing = Direction.fromYRot(messagePackHelper.getInt("facing"));
			this.currentPositionX = messagePackHelper.getDouble("current_position_x");
			this.currentPositionY = messagePackHelper.getDouble("current_position_y");
			this.currentPositionZ = messagePackHelper.getDouble("current_position_z");
			// messagePackHelper.iterateArrayValue("riding_entities", (v, i) => {
			// 	const entry = v.asArrayValue() as [string, string];
			// 	const entity = world.getEntity(entry[1])
			// 	if (entity) {
			// 		this.ridingEntities.set(entry[0], entity);
			// 	}
			// })
			messagePackHelper.iterateArrayValue("floors", entry => this.floors.push(BlockPos.fromLong(entry.asLong())));

			this.doorOpen = true;
			this.doorValue = 0;
		}
		this.liftInstructions = new LiftInstructions();
	}

	public override toMessagePack() {
		const closestFloor = this.getCurrentFloorBlockPos()!;

		return {
			...super.toMessagePack(),

			lift_height: this.liftHeight,
			lift_width: this.liftWidth,
			lift_depth: this.liftDepth,
			lift_offset_x: this.liftOffsetX,
			lift_offset_y: this.liftOffsetY,
			lift_offset_z: this.liftOffsetZ,
			is_double_sided: this.isDoubleSided,
			lift_style: this.liftStyle,
			facing: Math.round(this.facing.toYRot()),
			current_position_x: closestFloor.getX(),
			current_position_y: closestFloor.getY(),
			current_position_z: closestFloor.getZ(),
			// "riding_entities": .packArrayHeader(ridingEntities.size()),
			// for (final UUID uuid : ridingEntities) {
			// 	messagePacker.packString(uuid.toString());
			// }
			floors: Array.from(this.floors, floor => floor.asLong())
		}
	}

	protected override hasTransportMode(): boolean {
		return false;
	}

	public setFloors(floors: Array<BlockPos>): void {
		this.floors.length = 0;
		this.floors.pushAll(floors);
	}

	public hasFloor(pos: BlockPos): boolean {
		return this.floors.includes(pos);
	}

	public getPositionX(): number {
		return this.currentPositionX;
	}

	public getPositionY(): number {
		return this.currentPositionY;
	}

	public getPositionZ(): number {
		return this.currentPositionZ;
	}

	public getLiftDirection(): LiftDirection {
		return this.liftDirection;
	}

	public hasUpDownButtonForFloor(checkFloor: number, hasButton: boolean[]) {
		this.floors.forEach(floor => {
			if (floor.getY() > checkFloor) {
				hasButton[0] = true;
			}
			if (floor.getY() < checkFloor) {
				hasButton[1] = true;
			}
		});
	}

	public pressButton(floor: number) {
		const movingUp = this.liftDirection == LiftDirection.UP;
		console.log(floor, movingUp, Math.floor(this.currentPositionY), Math.ceil(this.currentPositionY))
		this.liftInstructions!.addInstruction(movingUp ? Math.floor(this.currentPositionY) : Math.ceil(this.currentPositionY), movingUp, floor);
	}

	public getCurrentFloorBlockPos(): BlockPos | null {
		let distance = Number.MAX_VALUE;
		let closestFloor: BlockPos | null = null;
		for (const floor of this.floors) {
			const difference = Math.abs(this.currentPositionY - floor.getY());
			if (difference < distance) {
				distance = difference;
				closestFloor = floor;
			} else {
				return closestFloor;
			}
		}
		return closestFloor;
	}

	public isInvalidLift(): boolean {
		if (this.floors.isEmpty()) {
			return true;
		}
		const dimension = world.getDimension("overworld");
		for (const checkFloor of this.floors) {
			if (RailwayData.chunkLoaded(checkFloor) && dimension.getBlock(checkFloor.asJson())!.typeId != "mts:lift_track_floor") {
				return true;
			}
		}
		return false;
	}

	protected tick2(ticksElapsed: number): void {
		if (this.liftInstructions.hasInstructions() && this.doorValue == LiftBase.DOOR_MAX * 2) {
			this.doorOpen = false;
			this.liftInstructions.getTargetFloor(targetFloor => this.liftDirection = targetFloor > this.currentPositionY ? LiftDirection.UP : LiftDirection.DOWN);
		} else if (!this.liftInstructions.hasInstructions()) {
			this.liftDirection = LiftDirection.NONE;
		}

		if (!this.doorOpen && this.doorValue == 0) {
			this.liftInstructions.getTargetFloor(targetFloor => {
				const stoppingDistance = Math.abs(targetFloor - this.currentPositionY);
				this.liftDirection = stoppingDistance < Train.ACCELERATION_DEFAULT ? LiftDirection.NONE : targetFloor > this.currentPositionY ? LiftDirection.UP : LiftDirection.DOWN;

				if (this.liftDirection == LiftDirection.NONE) {
					this.speed = 0;
					this.doorOpen = true;
					this.currentPositionY = targetFloor;
					this.liftInstructions.arrived();

					const dimension = world.getDimension("overworld");
					const pos = this.getBlockPos().asJson();
					const blockEntity = dimension.getBlock(pos)!;
					if (blockEntity.typeId == "mts:lift_track_floor_1" && BlockLiftTrackFloor.TileEntityLiftTrackFloorHelper.getShouldDing(blockEntity)) {
						dimension.playSound("note.pling", pos, { volume: 16, pitch: 2 });
					}
				} else {
					if (stoppingDistance < 0.5 * this.speed * this.speed / Train.ACCELERATION_DEFAULT) {
						this.speed = Math.max(this.speed - 0.5 * this.speed * this.speed / stoppingDistance * ticksElapsed, Train.ACCELERATION_DEFAULT);
					} else {
						this.speed = Math.min(this.speed + Train.ACCELERATION_DEFAULT * ticksElapsed, 1);
					}

					this.currentPositionY += this.speed * this.liftDirection.speedMultiplier * ticksElapsed;
				}
			});
		} else {
			if (!this.doorOpen && this.doorValue > 0 || this.doorOpen && this.doorValue < LiftBase.DOOR_MAX * 2) {
				if (this.doorOpen) {
					this.doorValue = Math.min(this.doorValue + ticksElapsed, LiftBase.DOOR_MAX * 2);
				} else {
					this.doorValue = Math.max(this.doorValue - ticksElapsed, 0);
				}
			}

			this.frontCanOpen = this.checkDoor(true);
			if (this.isDoubleSided) {
				this.backCanOpen = this.checkDoor(false);
			}
		}
	}

	protected getYaw(): number {
		return Mth.toRadians(-this.facing.getClockWise().toYRot());
	}

	private getBlockPos(): BlockPos {
		return RailwayData.newBlockPos(this.currentPositionX, this.currentPositionY, this.currentPositionZ);
	}

	private checkDoor(front: boolean): boolean {
		const directionClockwise = this.facing.getClockWise();
		const sign = front ? 1 : -1;
		let hasDoor = false;
		// for (let i = -1; i <= 1; i++) {
		// 	const checkPos = RailwayData.newBlockPos(this.currentPositionX + this.liftOffsetX / 2 - this.facing.getStepX() * sign * (liftDepth / 2F + 0.5) + directionClockwise.getStepX() * i, currentPositionY + liftOffsetY, currentPositionZ + liftOffsetZ / 2F - facing.getStepZ() * sign * (liftDepth / 2F + 0.5) + directionClockwise.getStepZ() * i);
		// 	if (world.getNearestPlayer(currentPositionX, currentPositionY, currentPositionZ, Train.MAX_CHECK_DISTANCE, entity => true) != null && RailwayData.chunkLoaded(world, checkPos) && RailwayData.chunkLoaded(world, checkPos.above())) {
		// 		final BlockEntity entity1 = world.getBlockEntity(checkPos);
		// 		final BlockEntity entity2 = world.getBlockEntity(checkPos.above());
		// 		if (entity1 instanceof BlockPSDAPGDoorBase.TileEntityPSDAPGDoorBase && entity2 instanceof BlockPSDAPGDoorBase.TileEntityPSDAPGDoorBase && IBlock.getStatePropertySafe(world, checkPos, BlockPSDAPGDoorBase.UNLOCKED) && IBlock.getStatePropertySafe(world, checkPos.above(), BlockPSDAPGDoorBase.UNLOCKED)) {
		// 			if (!world.isClientSide) {
		// 				((BlockPSDAPGDoorBase.TileEntityPSDAPGDoorBase) entity1).setOpen(Math.min(Math.round(doorValue), DOOR_MAX));
		// 				((BlockPSDAPGDoorBase.TileEntityPSDAPGDoorBase) entity2).setOpen(Math.min(Math.round(doorValue), DOOR_MAX));
		// 			}
		// 			hasDoor = true;
		// 		}
		// 	}
		// }

		return true;
	}
}