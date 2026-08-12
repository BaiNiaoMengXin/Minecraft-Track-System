import { ItemComponentUseOnEvent, ItemStack, Player, Vector3 } from "@minecraft/server";
import { ItemBlockClickingBase } from "./ItemBlockClickingBase";
import { BlockPos } from "util/math/BlockPos";
import { BlockLiftButtons } from "block/BlockLiftButtons";

export class ItemLiftButtonsLinkModifier extends ItemBlockClickingBase {

	private readonly isConnector: boolean;

	public constructor(isConnector: boolean) {
		super();
		this.isConnector = isConnector;
	}

	protected override onStartClick() {
	}

	protected override onEndClick(event: ItemComponentUseOnEvent, posEnd: BlockPos, newItemStack: ItemStack): void {
		const posStart = new BlockPos(event.block.location);
		const blockStart = event.block;
		const blockEnd = blockStart.dimension.getBlock(posEnd.asJson());

		if (blockStart.typeId == "mts:lift_track_floor_1" && blockEnd?.typeId == "mts:lift_buttons_1" || blockStart.typeId == "mts:lift_buttons_1" && blockEnd?.typeId == "mts:lift_track_floor_1"/* || blockStart instanceof BlockLiftTrackFloor && blockEnd instanceof BlockLiftPanelBase || blockStart instanceof BlockLiftPanelBase && blockEnd instanceof BlockLiftTrackFloor*/) {
			let posFloor: BlockPos;
			let posButtons: BlockPos;
			if (blockStart.typeId == "mts:lift_track_floor_1") {
				posFloor = posStart;
				posButtons = posEnd;
			} else {
				posFloor = posEnd;
				posButtons = posStart;
			}

			const blockEntity = blockStart.dimension.getBlock(posButtons.asJson());
			if (blockEntity?.typeId == "mts:lift_buttons_1") {
				BlockLiftButtons.TileEntityLiftButtonsHelper.registerFloor(blockEntity, posFloor, this.isConnector);
			}

			// if (blockEntity instanceof BlockLiftPanelBase.TileEntityLiftPanel1Base) {
			// 	((BlockLiftPanelBase.TileEntityLiftPanel1Base) blockEntity).registerFloor(posFloor, isConnector);
			// }
		}
	}

	protected override clickCondition(event: ItemComponentUseOnEvent): boolean {
		const block = event.block;
		return block.typeId == "mts:lift_track_floor_1" || block.typeId == "mts:lift_buttons_1"/* || block instanceof BlockLiftPanelBase*/;
	}
}
