import { BlockPermutation, ButtonState, EntityComponentTypes, InputButton, ItemComponentUseOnEvent, ItemStack, Player } from "@minecraft/server";
import { ItemNodeModifierBase } from "./ItemNodeModifierBase";
import { BlockNode } from "block/BlockNode";
import { RailAngle } from "data/RailAngle";
import { TransportMode } from "data/TransportMode";
import { BlockPos } from "util/math/BlockPos";

export abstract class ItemNodeModifierSelectableBlockBase extends ItemNodeModifierBase {

	private readonly canSaveBlock: boolean;
	private readonly height: number;
	private readonly width: number;
	private readonly radius: number;

	private static DYN_PROP_BLOCK_PERM = "block_permutation";

	public constructor(canSaveBlock: boolean, height: number, width: number) {
		super(true, false, false, true);
		this.canSaveBlock = canSaveBlock;
		this.height = height;
		this.width = width;
		this.radius = width / 2;
	}

	public override useOn(event: ItemComponentUseOnEvent): void {
		if (this.canSaveBlock) {
			if (event.source instanceof Player) {
				const player = event.source;
				if (player != null && (player.inputInfo.getButtonState(InputButton.Sneak) == ButtonState.Pressed || player.isSneaking)) {
					const permutation = event.block.permutation;
					let newPermutation: BlockPermutation;
					if (BlockNode.isNode(event.block)) {
						newPermutation = BlockPermutation.resolve("minecraft:air");
					} else {
						newPermutation = permutation;
					}

					player.onScreenDisplay.setActionBar({
						translate: "tooltip.mts.selected_material",
						with: {
							rawtext: [
								{
									translate: newPermutation.localizationKey
								}
							]
						}
					});
					
					const outParmString = newPermutation.type.id + "|" + JSON.stringify(newPermutation.getAllStates());
					event.itemStack.setDynamicProperty(ItemNodeModifierSelectableBlockBase.DYN_PROP_BLOCK_PERM, outParmString);
					player.getComponent(EntityComponentTypes.Inventory)?.container.setItem(player.selectedSlotIndex, event.itemStack);
				}
			}
		}

		return super.useOn(event);
	}

	protected override beforeSetNewItemStack(oldItemStack: ItemStack, newItemStack: ItemStack): void {
		newItemStack.setDynamicProperty(ItemNodeModifierSelectableBlockBase.DYN_PROP_BLOCK_PERM, oldItemStack.getDynamicProperty(ItemNodeModifierSelectableBlockBase.DYN_PROP_BLOCK_PERM));
	}

	protected onConnect(transportMode: TransportMode, permutationStart: BlockPermutation, permutationEnd: BlockPermutation, posStart: BlockPos, posEnd: BlockPos, facingStart: RailAngle, facingEnd: RailAngle, player: Player): void {
		if (player != null && !this.onConnect2(player, player.getComponent(EntityComponentTypes.Inventory)?.container.getItem(player.selectedSlotIndex)!, posStart, posEnd, this.radius, this.height)) {
			player.onScreenDisplay.setActionBar({ translate: "gui.mts.rail_not_found_action" });
		}
	}

	protected override onRemove(posStart: BlockPos, posEnd: BlockPos, player: Player): void {
	}

	protected getSavedPermutation(stack: ItemStack): BlockPermutation {
		const str = stack.getDynamicProperty(ItemNodeModifierSelectableBlockBase.DYN_PROP_BLOCK_PERM)
		if (str !== undefined && typeof str == "string") {
			const arr = str.split("|");
			const typeId = arr[0];
			const states = JSON.parse(arr[1]) as Record<string, string | number | boolean>;
			return BlockPermutation.resolve(typeId, states);
		} else {
			return BlockPermutation.resolve("minecraft:air");
		}
	}

	protected abstract onConnect2(player: Player, stack: ItemStack, posStart: BlockPos, posEnd: BlockPos, radius: number, height: number): boolean;
}
