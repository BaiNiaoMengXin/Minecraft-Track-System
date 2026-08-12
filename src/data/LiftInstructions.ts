import { ArrayList } from "jLib/ArrayList";
import { MTS } from "MTS";
import { BlockPos } from "util/math/BlockPos";
import { Lift } from "./Lift";
import { RailwayData } from "./RailwayData";
import { JavaObject } from "jLib/Object";
import { LiftDirection } from "./LiftBase";
import { Block, Vector3, world } from "@minecraft/server";
import { BlockLiftButtons } from "block/BlockLiftButtons";

class LiftInstruction implements JavaObject {

	readonly floor: number;
	readonly movingUp: boolean;

	constructor(floor: number, movingUp: boolean) {
		this.floor = floor;
		this.movingUp = movingUp;
	}

	canInsert(previousInstruction: LiftInstruction, newFloor: number, newMovingUp: boolean) {
		if (RailwayData.isBetween(newFloor, previousInstruction.floor, this.floor) && newMovingUp == this.movingUp) {
			return true;
		} else {
			return previousInstruction.movingUp != this.movingUp && previousInstruction.movingUp == (newFloor > previousInstruction.floor);
		}
	}

	public equals(object: JavaObject): boolean {
		return object instanceof LiftInstruction && this.floor == object.floor && this.movingUp == object.movingUp;
	}
}

export class LiftInstructions {

	private _isDirty = false;
	private readonly instructions = new ArrayList<LiftInstruction>;

	public constructor() {
	}

	public getTargetFloor(callback: (arg: number) => void): void {
		if (this.hasInstructions()) {
			callback(this.instructions[0].floor);
		}
	}

	public arrived(): void {
		if (this.hasInstructions()) {
			this.instructions.splice(0);
			this._isDirty = true;
		}
	}

	public hasInstructions(): boolean {
		return this.instructions.length > 0;
	}

	public addInstruction(currentFloor: number, currentMovingUp: boolean, floor: number): void {
		this.addInstruction2(currentFloor, currentMovingUp, floor, false, true, true);
	}

	public isDirty(): boolean {
		const isDirtyTemp = this._isDirty;
		this._isDirty = false;
		return isDirtyTemp;
	}

	private addInstruction2(currentFloor: number, currentMovingUp: boolean, newFloor: number, newMovingUp: boolean, noDirection: boolean, shouldAdd: boolean) {
		if (currentFloor == newFloor) {
			return 0;
		}

		const tempInstructions: Array<LiftInstruction> = [...this.instructions];
		tempInstructions.unshift(new LiftInstruction(currentFloor, currentMovingUp));

		let distance = 0;
		for (let i = 0; i < tempInstructions.length - 1; i++) {
			const previousInstruction = tempInstructions[i];
			const nextInstruction = tempInstructions[i + 1];
			const newMovingUpTemp = noDirection ? nextInstruction.movingUp : newMovingUp;

			if (this.instructions.includes(new LiftInstruction(newFloor, newMovingUpTemp))) {
				return -1;
			}

			if (nextInstruction.canInsert(previousInstruction, newFloor, newMovingUpTemp)) {
				if (shouldAdd) {
					// this.instructions.(i, new LiftInstruction(newFloor, newMovingUpTemp));
					this._isDirty = true;
				}
				return distance + Math.abs(newFloor - previousInstruction.floor);
			}

			distance += Math.abs(nextInstruction.floor - previousInstruction.floor);
		}

		const lastInstruction = this.hasInstructions() ? this.instructions[this.instructions.length - 1].floor : currentFloor;
		if (shouldAdd) {
			this.instructions.push(new LiftInstruction(newFloor, noDirection ? newFloor > lastInstruction : newMovingUp));
			this._isDirty = true;
		}
		return distance + Math.abs(newFloor - lastInstruction);
	}

	public containsInstruction(floor: number, movingUp: boolean): boolean;
	public containsInstruction(floor: number): boolean;

	public containsInstruction(floor: number, movingUp?: boolean): boolean {
		if (movingUp !== undefined) {
			return this.instructions.includes(new LiftInstruction(floor, movingUp));
		} else {
			return this.containsInstruction(floor, true) || this.containsInstruction(floor, false);
		}
	}

	public static addInstruction(pos: Vector3, topHalfClicked: boolean): void {
		const blockEntity = world.getDimension("overworld").getBlock(pos);
		if (blockEntity?.typeId != "mts:lift_buttons_1") {
			return;
		}

		let currentWeight = Number.MAX_SAFE_INTEGER;
		let liftInstructionsToUse: LiftInstructions | null = null;
		let liftFloorToUse = 0;
		let liftMovingUpToUse = false;
		let newLiftFloorToUse = 0;
		const hasButtonOverall = [false, false];

		BlockLiftButtons.TileEntityLiftButtonsHelper.forEachTrackPosition(blockEntity, (trackPosition: BlockPos) => {
			let lift: Lift | undefined = undefined;
			for (const lift2 of MTS.railwayData.lifts) {
				if (lift2.hasFloor(trackPosition)) {
					lift = lift2;
					break;
				}
			}
			if (!lift) {
				return;
			}

			const liftFloor = Math.round(lift.getPositionY());

			const newLiftFloor = trackPosition.getY();
			const hasButton = [false, false];
			lift.hasUpDownButtonForFloor(newLiftFloor, hasButton);
			let newMovingUp: boolean;
			if (topHalfClicked) {
				newMovingUp = hasButton[0];
			} else {
				newMovingUp = !hasButton[1];
			}

			const liftMovingUp = lift.getLiftDirection() == LiftDirection.UP;
			const weight = lift.liftInstructions.addInstruction2(liftFloor, liftMovingUp, newLiftFloor, newMovingUp, false, false);

			if (weight >= 0 && (topHalfClicked == newMovingUp && weight < currentWeight || newMovingUp && !hasButtonOverall[0] || !newMovingUp && !hasButtonOverall[1])) {
				currentWeight = weight;
				liftInstructionsToUse = lift.liftInstructions;
				liftFloorToUse = liftFloor;
				liftMovingUpToUse = liftMovingUp;
				newLiftFloorToUse = newLiftFloor;
			}

			if (hasButton[0]) {
				hasButtonOverall[0] = true;
			}
			if (hasButton[1]) {
				hasButtonOverall[1] = true;
			}
		});

		if (liftInstructionsToUse != null) {
			let newMovingUp: boolean;
			if (topHalfClicked) {
				newMovingUp = hasButtonOverall[0];
			} else {
				newMovingUp = !hasButtonOverall[1];
			}
			(liftInstructionsToUse as LiftInstructions).addInstruction2(liftFloorToUse, liftMovingUpToUse, newLiftFloorToUse, newMovingUp, false, true);
		}
	}
}
