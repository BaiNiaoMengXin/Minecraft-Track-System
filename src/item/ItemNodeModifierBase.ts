import { BlockPermutation, ItemComponentUseOnEvent, ItemStack, Player, Vector3, world } from "@minecraft/server";
import { ItemBlockClickingBase } from "./ItemBlockClickingBase";
import { TransportMode } from "data/TransportMode";
import { BlockNode } from "block/BlockNode";
import { BlockPos } from "util/math/BlockPos";
import { Mth } from "util/math/Mth";
import { RailAngle } from "data/RailAngle";

export abstract class ItemNodeModifierBase extends ItemBlockClickingBase {

	public readonly forNonContinuousMovementNode: boolean;
	public readonly forContinuousMovementNode: boolean;
	public readonly forAirplaneNode: boolean;
	protected readonly isConnector: boolean;

	private static readonly DYN_PROP_TRANSPORT_MODE = "transport_mode";

	public constructor(forNonContinuousMovementNode: boolean, forContinuousMovementNode: boolean, forAirplaneNode: boolean, isConnector: boolean) {
		super();
		this.forNonContinuousMovementNode = forNonContinuousMovementNode;
		this.forContinuousMovementNode = forContinuousMovementNode;
		this.forAirplaneNode = forAirplaneNode;
		this.isConnector = isConnector;
	}

	protected override onStartClick(event: ItemComponentUseOnEvent, newItemStack: ItemStack): void {
		// TODO temporary code
		newItemStack.setDynamicProperty(ItemNodeModifierBase.DYN_PROP_TRANSPORT_MODE, TransportMode.TRAIN.toString());
		// TODO temporary code end
	}

	protected override onEndClick(event: ItemComponentUseOnEvent, posEnd: BlockPos, newItemStack: ItemStack): void {
		const posStart = new BlockPos(event.block.location);
		const dimiension = world.getDimension('overworld');
		const permutationStart = dimiension.getBlock(posStart.asJson())?.permutation;
		const permutationEnd = dimiension.getBlock(posEnd.asJson())?.permutation;

		// TODO temporary code
		if (permutationStart && permutationEnd && TransportMode.TRAIN.toString() == event.itemStack.getDynamicProperty(ItemNodeModifierBase.DYN_PROP_TRANSPORT_MODE)) {
			const player = event.source as Player;

			if (this.isConnector) {
				if (!posStart.equals(posEnd)) {
					const angle1 = BlockNode.getAngle(permutationStart);
					const angle2 = BlockNode.getAngle(permutationEnd);

					const angleDifference = Mth.toDegrees(Math.atan2(posEnd.getZ() - posStart.getZ(), posEnd.getX() - posStart.getX()));
					const railAngleStart = RailAngle.fromAngle(angle1 + (RailAngle.similarFacing(angleDifference, angle1) ? 0 : 180));
					const railAngleEnd = RailAngle.fromAngle(angle2 + (RailAngle.similarFacing(angleDifference, angle2) ? 180 : 0));

					this.onConnect(TransportMode.TRAIN, permutationStart, permutationEnd, posStart, posEnd, railAngleStart, railAngleEnd, player);
					// TODO temporary code end
				}
			} else {
				this.onRemove(posStart, posEnd, player);
			}
		}
	}

	protected override clickCondition(event: ItemComponentUseOnEvent): boolean {
		if (event.block.typeId == BlockNode.RAIL_NODE_BLOCK_KEY_NAME) {
			// TODO
			/* if (blockNode.transportMode == TransportMode.AIRPLANE) {
				return forAirplaneNode;
			} else { */
			return TransportMode.TRAIN.continuousMovement ? this.forContinuousMovementNode : this.forNonContinuousMovementNode;
			//}
		} else {
			return false;
		}
	}

	protected abstract onConnect(transportMode: TransportMode, permutationStart: BlockPermutation, permutationEnd: BlockPermutation, posStart: BlockPos, posEnd: BlockPos, facingStart: RailAngle, facingEnd: RailAngle, player: Player): void;

	protected abstract onRemove(posStart: BlockPos, posEnd: BlockPos, player: Player): void;
}
