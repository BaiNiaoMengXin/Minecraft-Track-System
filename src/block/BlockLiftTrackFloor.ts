import { Block, BlockComponentTypes, PlayerInteractWithBlockBeforeEvent, system } from "@minecraft/server";
import { BlockBase } from "./BlockBase";
import { LiftTrackFloorScreen } from "screen/LiftTrackFloorScreen";

export class BlockLiftTrackFloor extends BlockBase {

	public override use(event: PlayerInteractWithBlockBeforeEvent): void {
		if (event.itemStack?.typeId == "mts:brush") {
			new LiftTrackFloorScreen(event.player, event.block).show();
		};
	}

	public static readonly TileEntityLiftTrackFloorHelper = class {

		private static readonly KEY_FLOOR_NUMBER = "floor_number";
		private static readonly KEY_FLOOR_DESCRIPTION = "floor_description";
		private static readonly KEY_SHOULD_DING = "should_ding";

		private constructor() {}

		public static setData(block: Block, floorNumber: string, floorDescription: string, shouldDing: boolean) {
			const dynamicProperties = block.getComponent(BlockComponentTypes.DynamicProperties)!;

			dynamicProperties.set(this.KEY_FLOOR_NUMBER, floorNumber);
			dynamicProperties.set(this.KEY_FLOOR_DESCRIPTION, floorDescription);
			dynamicProperties.set(this.KEY_SHOULD_DING, shouldDing);
		}

		public static getFloorNumber(block: Block): string {
			const dynamicProperties = block.getComponent(BlockComponentTypes.DynamicProperties)!;
			const value = dynamicProperties.get(this.KEY_FLOOR_NUMBER);
			if (typeof value != "string") {
				dynamicProperties.set(this.KEY_FLOOR_NUMBER, "1")
				return "1";
			} else {
				return value;
			}
		}

		public static getFloorDescription(block: Block): string {
			const dynamicProperties = block.getComponent(BlockComponentTypes.DynamicProperties)!;
			const value = dynamicProperties.get(this.KEY_FLOOR_DESCRIPTION);
			if (typeof value != "string") {
				dynamicProperties.set(this.KEY_FLOOR_DESCRIPTION, "")
				return "";
			} else {
				return value;
			}
		}

		public static getShouldDing(block: Block): boolean {
			const dynamicProperties = block.getComponent(BlockComponentTypes.DynamicProperties)!;
			const value = dynamicProperties.get(this.KEY_SHOULD_DING);
			if (typeof value != "boolean") {
				dynamicProperties.set(this.KEY_SHOULD_DING, false)
				return false;
			} else {
				return value;
			}
		}
	}
}
