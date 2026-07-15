import { EntityComponentTypes, ItemComponentUseOnEvent, ItemStack, Player, Vector3 } from "@minecraft/server";
import { ItemBase } from "./ItemBase";
import { BlockPos } from "util/math/BlockPos";

/**
 * It also handles events for items whose identifiers end with "_selected".
 */
export abstract class ItemBlockClickingBase extends ItemBase {

	public static readonly DYN_PROP_POS = "pos";
	public static readonly SELECTED_END_FLAG = "_selected";

	public override useOn(event: ItemComponentUseOnEvent): void {
		if (event.source instanceof Player && this.clickCondition(event)) {
			const posEnd = event.itemStack.getDynamicProperty(ItemBlockClickingBase.DYN_PROP_POS) as Vector3 | undefined;
			const player = event.source;
			const itemType = event.itemStack.typeId;
			const isSelected = itemType.endsWith(ItemBlockClickingBase.SELECTED_END_FLAG);

			const newItemStack = new ItemStack(
				isSelected ? 
				itemType.substring(0, itemType.length - ItemBlockClickingBase.SELECTED_END_FLAG.length) : 
				itemType + ItemBlockClickingBase.SELECTED_END_FLAG
			);

			if (isSelected) {
				if (posEnd === undefined) return;

				this.onEndClick(event, new BlockPos(posEnd), newItemStack);
			} else {
				newItemStack.setDynamicProperty(ItemBlockClickingBase.DYN_PROP_POS, event.block.location);
				this.onStartClick(event, newItemStack);
			}
			this.beforeSetNewItemStack(event.itemStack, newItemStack)
			player.getComponent(EntityComponentTypes.Inventory)?.container.setItem(player.selectedSlotIndex, newItemStack);
		}
	}

	protected beforeSetNewItemStack(oldItemStack: ItemStack, newItemStack: ItemStack): void {
	}

	protected abstract onStartClick(event: ItemComponentUseOnEvent, newItemStack: ItemStack): void;

	protected abstract onEndClick(event: ItemComponentUseOnEvent, posEnd: BlockPos, newItemStack: ItemStack): void;

	protected abstract clickCondition(event: ItemComponentUseOnEvent): boolean;
}
