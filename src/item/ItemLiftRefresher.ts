import { Block, ItemComponentUseOnEvent, Player, Vector3 } from "@minecraft/server";
import { ItemBase } from "./ItemBase";
import { Direction } from "util/math/Direction";
import { BlockPos } from "util/math/BlockPos";
import { Lift } from "data/Lift";
import { MTS } from "MTS";
import { RailwayData } from "data/RailwayData";
import { LiftCustomizationScreen } from "screen/LiftCustomizationScreen";

export class ItemLiftRefresher extends ItemBase {

	public override useOn(event: ItemComponentUseOnEvent): void {
		ItemLiftRefresher.refreshLift2(event.block, event.source as Player, 0, 0, 2, 2, false, null);
	}

	public static refreshLift(clickedBlock: Block, offsetX: number, offsetZ: number, width: number, depth: number, isDoubleSided: boolean, forceFacing: Direction): void {
		this.refreshLift2(clickedBlock, undefined, offsetX, offsetZ, width, depth, isDoubleSided, forceFacing);
	}

	private static refreshLift2(clickedBlock: Block, player: Player | undefined, offsetX: number, offsetZ: number, width: number, depth: number, isDoubleSided: boolean, forceFacing: Direction | null): void {
		if (clickedBlock.typeId == "mts:lift_track_1") {
			const floors: Array<BlockPos> = [];
			const liftsToModify = new Set<Lift>();
			let i = 0;
			let scanForFloors = false;
			let firstFloor: BlockPos | null = null;
			let facing: Direction | null = null;

			RailwayData.validateLifts(MTS.railwayData.lifts);

			while (true) {
				const checkPos = new BlockPos(clickedBlock).below(i);
				const checkBlock = clickedBlock.dimension.getBlock(checkPos.asJson());

				if (!checkBlock?.typeId.startsWith("mts:lift_track")) {
					if (scanForFloors) {
						break;
					} else {
						scanForFloors = true;
					}
				}

				if (scanForFloors && checkBlock?.typeId == "mts:lift_track_floor_1") {
					floors.push(checkPos);
					if (firstFloor == null || facing == null) {
						firstFloor = checkPos;
						facing = Direction.valueOf(checkBlock.permutation.getState("minecraft:cardinal_direction")!)!;
					}

					MTS.railwayData.lifts.forEach(lift => {
						if (lift.hasFloor(checkPos)) {
							liftsToModify.add(lift);
						}
					});
				}

				i += (scanForFloors ? -1 : 1);
			}

			if (floors.length == 0 || firstFloor == null || facing == null) {
				if (player != null) {
					player.onScreenDisplay.setActionBar({ translate: "gui.mts.no_lift_tracks_floor_found" });
				}
			} else {
				let hasSetFloors = false;
				let lift: Lift;
				for (const lift2 of liftsToModify) {
					if (hasSetFloors) {
						MTS.railwayData.lifts.delete(lift2);
					} else {
						lift = lift2
						this.setLiftData(lift2, floors, offsetX, offsetZ, width, depth, isDoubleSided);
						hasSetFloors = true;
					}
				}

				if (!hasSetFloors) {
					lift = new Lift(firstFloor, forceFacing == null ? facing : forceFacing);
					this.setLiftData(lift, floors, offsetX, offsetZ, width, depth, isDoubleSided);
					MTS.railwayData.lifts.add(lift);
				}

				if (player) {
					new LiftCustomizationScreen(player, lift!).show();
				}
			}

			MTS.railwayData.dataCache.sync();
		} else {
			if (player != null) {
				player.onScreenDisplay.setActionBar({ translate: "gui.mts.lift_track_required" });
			}
		}
	}

	private static setLiftData(lift: Lift, floors: Array<BlockPos>, offsetX: number, offsetZ: number, width: number, depth: number, isDoubleSided: boolean) {
		lift.setFloors(floors);
		lift.liftOffsetX = offsetX;
		lift.liftOffsetZ = offsetZ;
		lift.liftWidth = width;
		lift.liftDepth = depth;
		lift.isDoubleSided = isDoubleSided;
		return lift.id;
	}
}
