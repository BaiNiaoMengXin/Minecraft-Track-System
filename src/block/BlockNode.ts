import { BlockPermutation, Player, world } from "@minecraft/server";
import { RailAngle } from "data/RailAngle";
import { BlockPos } from "util/math/BlockPos";

export class BlockNode {

    public static readonly RAIL_NODE_BLOCK_KEY_NAME = "mts:rail_node";

    public static readonly FACING = "mts:facing";
    public static readonly IS_22_5 = "mts:is_22_5";
    public static readonly IS_45 = "mts:is_45";
    public static readonly IS_CONNECTED = "mts:is_connected";

    public static resetRailNode(pos: BlockPos): void {
        try {
            const block = world.getDimension("overworld").getBlock(pos.asJson());
            block?.setPermutation(block.permutation.withState(BlockNode.IS_CONNECTED as any, false));
        } catch (e) {
            console.error(e);
        }
    }

    public static updateRailNodeState(player: Player, pos: BlockPos) {
        const dimension = world.getDimension('overworld');
        const block = dimension.getBlock(pos.asJson());

        const quadrant = RailAngle.getQuadrant(player.getRotation().y, true);
        const blockPermutation = BlockPermutation.resolve(this.RAIL_NODE_BLOCK_KEY_NAME, {
            [this.FACING]: quadrant % 8 >= 4,
            [this.IS_45]: quadrant % 4 >= 2,
            [this.IS_22_5]: quadrant % 2 >= 1,
            [this.IS_CONNECTED]: false
        });
        block?.setPermutation(blockPermutation);
    }

    public static getAngle(blockPermutation: BlockPermutation): number {
        return ((blockPermutation.getState(BlockNode.FACING as any) as boolean) ? 0 : 90) + ((blockPermutation.getState(BlockNode.IS_22_5 as any) as boolean) ? 22.5 : 0) + ((blockPermutation.getState(BlockNode.IS_45 as any) as boolean) ? 45 : 0);
    }
}