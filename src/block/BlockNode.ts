import { BlockPermutation, world } from "@minecraft/server";
import { RailAngle } from "data/RailAngle";
import { BlockPos } from "util/math/BlockPos";

export class BlockNode {

    public static readonly RAIL_NODE_BLOCK_KEY_NAME = "mts:rail_node";
    
    private static readonly FACING = "mts:node_facing";

    public static resetRailNode(pos: BlockPos): void {
        try {
            const block = world.getDimension("overworld").getBlock(pos.asJson());
            block!.setPermutation(BlockPermutation.resolve(BlockNode.RAIL_NODE_BLOCK_KEY_NAME, {"mts:hide": 0, [BlockNode.FACING]: block!.permutation.getState(BlockNode.FACING as any)!}));
        } catch (e) {
            world.sendMessage(`§cUnable to remove this rail node(${pos.getX()}, ${pos.getY()}, ${pos.getZ()}): ${e}`);
        }
    }

    public static updateRailNodeState(pos: BlockPos, facing: RailAngle) {
        // TODO temporary code
        const dimension = world.getDimension('overworld');
        const block = dimension.getBlock(pos.asJson());
        
        if (block && block.typeId === 'mts:rail_node') {
            let quadrant = 0;
            // TODO the code is shit
            switch (facing.angleDegrees) {
                case 0:         quadrant = 4;   break;
                case 22.5:      quadrant = 5;   break;
                case 45:        quadrant = 2;   break;
                case 67.5:      quadrant = 7;   break;

                case 90:        quadrant = 0;   break;
                case 112.5:     quadrant = 1;   break;
                case 135:       quadrant = 6;   break;
                case 157.5:     quadrant = 3;   break;
                case 180:       quadrant = 4;   break;

                case 202.5:     quadrant = 5;   break;
                case 225:       quadrant = 2;   break;
                case 247.5:     quadrant = 7;   break;
                case 270:       quadrant = 0;   break;

                case 292.5:     quadrant = 1;   break;
                case 315:       quadrant = 6;   break;
                case 337.5:     quadrant = 3;   break;
                default:                        break;
            }
            block.setPermutation(BlockPermutation.resolve("mts:rail_node", {
                "mts:node_facing": quadrant
            }));
            // TODO the code is shit end
        }
        // TODO temporary code end
    }
}