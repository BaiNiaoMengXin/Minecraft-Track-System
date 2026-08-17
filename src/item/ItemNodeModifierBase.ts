import { BlockPermutation, ItemComponentUseOnEvent, ItemStack, Player, system, Vector3, world } from "@minecraft/server";
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
		newItemStack.setDynamicProperty(ItemNodeModifierBase.DYN_PROP_TRANSPORT_MODE, BlockNode.getTransportMode(event.block).toString());
	}

	protected override async onEndClick(event: ItemComponentUseOnEvent, posEnd: BlockPos, newItemStack: ItemStack): Promise<void> {
		const posStart = new BlockPos(event.block.location);
		const transportModeStart = BlockNode.getTransportMode(event.block);
		const permutationStart = event.block.permutation;
		const dimiension = world.getDimension('overworld');
		const player = event.source as Player;

		let playerOriginPos: Vector3 | undefined;
		
		while (!dimiension.isChunkLoaded(posEnd.asJson())) {
			if (playerOriginPos == undefined)  {
				playerOriginPos = player.location;
				player.sendMessage({ translate: "unloadedchunk.message.warning" });
			}
			player.teleport(posEnd.asJson());
			await system.waitTicks(1);
		}
		const blockEnd = dimiension.getBlock(posEnd.asJson())!;
		const permutationEnd = blockEnd.permutation;

		if (BlockNode.isNode(blockEnd) && transportModeStart.toString() == event.itemStack.getDynamicProperty(ItemNodeModifierBase.DYN_PROP_TRANSPORT_MODE)) {
			if (this.isConnector) {
				if (!posStart.equals(posEnd)) {
					const angle1 = BlockNode.getAngle(permutationStart);
					const angle2 = BlockNode.getAngle(permutationEnd);

					const angleDifference = Mth.toDegrees(Math.atan2(posEnd.getZ() - posStart.getZ(), posEnd.getX() - posStart.getX()));
					const railAngleStart = RailAngle.fromAngle(angle1 + (RailAngle.similarFacing(angleDifference, angle1) ? 0 : 180));
					const railAngleEnd = RailAngle.fromAngle(angle2 + (RailAngle.similarFacing(angleDifference, angle2) ? 180 : 0));

					this.onConnect(transportModeStart, permutationStart, permutationEnd, posStart, posEnd, railAngleStart, railAngleEnd, player);
				}
			} else {
				this.onRemove(posStart, posEnd, player);
			}
		}

		if (playerOriginPos != undefined) {
			player.teleport(playerOriginPos);
		}
	}

	protected override clickCondition(event: ItemComponentUseOnEvent): boolean {
		if (BlockNode.isNode(event.block)) {
			if (BlockNode.getTransportMode(event.block) == TransportMode.AIRPLANE) {
				return this.forAirplaneNode;
			} else {
				return BlockNode.getTransportMode(event.block).continuousMovement ? this.forContinuousMovementNode : this.forNonContinuousMovementNode;
			}
		} else {
			return false;
		}
	}

	protected abstract onConnect(transportMode: TransportMode, permutationStart: BlockPermutation, permutationEnd: BlockPermutation, posStart: BlockPos, posEnd: BlockPos, facingStart: RailAngle, facingEnd: RailAngle, player: Player): void;

	protected abstract onRemove(posStart: BlockPos, posEnd: BlockPos, player: Player): void;
}
