import { Block, BlockComponentTypes, PlayerInteractWithBlockBeforeEvent, system, Vector3 } from "@minecraft/server";
import { LZString } from "libs/lz-string";
import { BlockPos } from "util/math/BlockPos";
import { BlockBase } from "./BlockBase";
import { LiftInstructions } from "data/LiftInstructions";

export class BlockLiftButtons extends BlockBase {

	public static readonly STATE_UNLOCKED = "mts:unlocked";

	public override use(event: PlayerInteractWithBlockBeforeEvent): void {
		const permutation = event.block.permutation;
		if (event.itemStack?.typeId == "mts:brush") {
			const unlocked = !permutation.getState(BlockLiftButtons.STATE_UNLOCKED as any);
			event.block.setPermutation(permutation.withState(BlockLiftButtons.STATE_UNLOCKED as any, unlocked));
			event.player.onScreenDisplay.setActionBar({ translate: unlocked ? "gui.mts.lift_buttons_unlocked" : "gui.mts.lift_buttons_locked" });
		} else if (event.itemStack?.typeId != "mts:lift_buttons_link_connector" && event.itemStack?.typeId != "mts:lift_buttons_link_remover") {
			const unlocked = permutation.getState(BlockLiftButtons.STATE_UNLOCKED as any) as boolean;
			if (unlocked) {
				const y = event.faceLocation.y;
				LiftInstructions.addInstruction(event.block.location, y - Math.floor(y) > 0.25);
			}
		}
	}

	public static readonly TileEntityLiftButtonsHelper = class {

		private static readonly KEY_TRACK_FLOOR_POS = "track_floor_pos";

		private constructor() { };

		public static registerFloor(block: Block, pos: BlockPos, isAdd: boolean) {
			const trackPositions = this.getTrackPositions(block);
			if (isAdd) {
				trackPositions.add(pos.asLong().toString());
			} else {
				trackPositions.delete(pos.asLong().toString());
			}
			this.setTrackPositions(block, trackPositions);
		}

		public static getTrackPositions(thiz: Block): Set<string> {
			const trackPositions_packed = thiz.getComponent(BlockComponentTypes.DynamicProperties)?.get(this.KEY_TRACK_FLOOR_POS) as string | undefined;
			if (trackPositions_packed == undefined) {
				return new Set();
			}
			return new Set(JSON.parse(LZString.decompressFromBase64(trackPositions_packed)!) as string[]);
		}

		private static setTrackPositions(thiz: Block, data: Set<string>): void {
			const packed = LZString.compressToBase64(JSON.stringify(Array.from(data)))
			thiz.getComponent(BlockComponentTypes.DynamicProperties)?.set(this.KEY_TRACK_FLOOR_POS, packed);
		}

		public static forEachTrackPosition(block: Block, callback: (block: BlockPos) => void): void {
			const trackPositions = this.getTrackPositions(block);
			const trackPositionsToRemove = new Set<string>();
			trackPositions.forEach(trackPosition => {
				const pos = BlockPos.fromLong(BigInt(trackPosition));
				const blockEntity = block.dimension.getBlock(pos.asJson());
				if (blockEntity?.typeId == "mts:lift_track_floor_1") {
					callback(pos);
				} else {
					trackPositionsToRemove.add(trackPosition);
				}
			});
			trackPositionsToRemove.forEach(v => trackPositions.delete(v));
			this.setTrackPositions(block, trackPositions);
		}
	}
}