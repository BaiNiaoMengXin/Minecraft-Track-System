import { Block, BlockPermutation, Vector3, world } from "@minecraft/server";
import { BlockBase } from "./BlockBase";
import { MTS } from "MTS";
import { Direction } from "util/math/Direction";
import { BlockPos } from "util/math/BlockPos";

export abstract class NeighborShapeUpdatingBlock extends BlockBase {

    public static setBlockAndUpdateShape(pos: Vector3, permutation: BlockPermutation): void;
    public static setBlockAndUpdateShape(block: Block, permutation: BlockPermutation): void;

    public static setBlockAndUpdateShape(arg1: Vector3 | Block, permutation: BlockPermutation): void {
        const dimension = world.getDimension("overworld");
        if (arg1 instanceof Block || dimension.isChunkLoaded(arg1)) {
            const selfBlock = arg1 instanceof Block ? arg1 : dimension.getBlock(arg1)!;
            selfBlock.setPermutation(permutation);

            this.updateNeighborBlocks(selfBlock);
        }
    }

    protected static updateNeighborBlocks(arg1: Vector3 | Block): void {
        const dimension = world.getDimension("overworld");
        const blockSelf = arg1 instanceof Block ? arg1 : dimension.getBlock(arg1)!;
        const posSelf = new BlockPos(arg1 instanceof Block ? arg1.location : arg1);

        for (const direction of Direction.values()) {
            const neighborPos = posSelf.relative(direction);
            const neighborBlock = dimension.getBlock(neighborPos.asJson());

            if (neighborBlock && MTS.registeredBlock.get(neighborBlock.typeId) instanceof NeighborShapeUpdatingBlock) {
                neighborBlock.setPermutation((MTS.registeredBlock.get(neighborBlock.typeId) as NeighborShapeUpdatingBlock).updateShape(neighborBlock, direction.getOpposite(), blockSelf));
            }
        }
    }

    public abstract updateShape(block: Block, direction: Direction, neighborBlock: Block): BlockPermutation;
}
