import { Block, BlockPermutation, Entity, PlayerBreakBlockBeforeEvent, PlayerInteractWithBlockBeforeEvent, system, world } from "@minecraft/server";
import { BlockEscalatorBase } from "./BlockEscalatorBase";
import { IBlock } from "./IBlock";
import { BlockPos } from "util/math/BlockPos";
import { Direction } from "util/math/Direction";
import { EntityInsideTriggeredBlock } from "./EntityInsideTriggeredBlock";
import { NeighborShapeUpdatingBlock } from "./NeighborShapeUpdatingBlock";

export class BlockEscalatorStep extends BlockEscalatorBase implements EntityInsideTriggeredBlock {

	public static readonly STATE_DIRECTION = "mts:direction";// boolean
	public static readonly STATE_STATUS = "mts:status";// boolean

	readonly isEntityInsideTriggeredBlock = true;
	
	public override updateShape(block: Block, direction: Direction, neighborBlock: Block): BlockPermutation {
		if (direction == Direction.UP && block.above()?.typeId != "mts:escalator_side") {
			return BlockPermutation.resolve("minecraft:air");
		} else {
			return super.updateShape(block, direction, neighborBlock);
		}
	}

	public override playerWillDestroy(event: PlayerBreakBlockBeforeEvent): void {
		const permutation = event.block.permutation;

		if (permutation.getState(IBlock.STATE_SIDE as any) as IBlock.EnumSide == IBlock.EnumSide.RIGHT) {
			system.run(() => NeighborShapeUpdatingBlock.setBlockAndUpdateShape(new BlockPos(event.block.location).relative(IBlock.getSideDirection(permutation)).asJson(), BlockPermutation.resolve("minecraft:air")));
		}

		system.run(() => NeighborShapeUpdatingBlock.updateNeighborBlocks(event.block));
	}

	public entityInside(entity: Entity, block: Block) {
		const permutation = block.permutation;
		const facing = permutation.getState(IBlock.STATE_FACING as any) as string;
		const direction = permutation.getState(BlockEscalatorStep.STATE_DIRECTION as any) as boolean;
		const speed = 0.1;

		if (permutation.getState(BlockEscalatorStep.STATE_STATUS as any) as boolean) {
			switch (facing) {
				case "north":
					entity.applyImpulse({ x: 0, y: 0, z: direction ? -speed : speed });
					break;
				case "east":
					entity.applyImpulse({ x: direction ? speed : -speed, y: 0, z: 0 });
					break;
				case "south":
					entity.applyImpulse({ x: 0, y: 0, z: direction ? speed : -speed });
					break;
				case "west":
					entity.applyImpulse({ x: direction ? -speed : speed, y: 0, z: 0 });
					break;
				default:
					break;
			}
		}
	}

	public override use(event: PlayerInteractWithBlockBeforeEvent): void {
		if (event.itemStack?.typeId == "mts:brush") {
			const permutation = event.block.permutation;

			const direction = permutation.getState(BlockEscalatorStep.STATE_DIRECTION as any) as boolean;
			const running = permutation.getState(BlockEscalatorStep.STATE_STATUS as any) as boolean;
			const blockFacing = Direction.valueOf(permutation.getState(IBlock.STATE_FACING as any) as string)!;
			let newDirection: boolean;
			let newRunning: boolean;

			if (direction && running) {
				// FORWARD to BACKWARD
				newDirection = false;
				newRunning = true;
			} else if (!direction && running) {
				// BACKWARD to STOP
				newDirection = false;
				newRunning = false;
			} else {
				// STOP to FORWARD
				newDirection = true;
				newRunning = true;
			}

			const pos = new BlockPos(event.block.location);
			BlockEscalatorStep.update(pos, blockFacing, newDirection, newRunning);
			BlockEscalatorStep.update(pos, blockFacing.getOpposite(), newDirection, newRunning);

			const sidePos = pos.relative(IBlock.getSideDirection(permutation));
			if (BlockEscalatorStep.isStep(sidePos)) {
				BlockEscalatorStep.update(sidePos, blockFacing, newDirection, newRunning);
				BlockEscalatorStep.update(sidePos, blockFacing.getOpposite(), newDirection, newRunning);
			}
		}
	}

	private static update(pos: BlockPos, offset: Direction, direction: boolean, running: boolean) {
		const block = world.getDimension("overworld").getBlock(pos.asJson())!;
		NeighborShapeUpdatingBlock.setBlockAndUpdateShape(block, block.permutation.withState(BlockEscalatorStep.STATE_DIRECTION as any, direction).withState(BlockEscalatorStep.STATE_STATUS as any, running));
		const offsetPos = new BlockPos(block.location).relative(offset);

		if (this.isStep(offsetPos)) {
			this.update(offsetPos, offset, direction, running);
		}
		if (this.isStep(offsetPos.above())) {
			this.update(offsetPos.above(), offset, direction, running);
		}
		if (this.isStep(offsetPos.below())) {
			this.update(offsetPos.below(), offset, direction, running);
		}
	}

	private static isStep(pos: BlockPos) {
		const permutation = world.getDimension("overworld").getBlock(pos.asJson())!.permutation;
		const states = permutation.getAllStates();
		return BlockEscalatorStep.STATE_DIRECTION in states && BlockEscalatorStep.STATE_STATUS in states;
	}
}
