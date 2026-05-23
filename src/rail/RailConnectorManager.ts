import { BlockPermutation, Player, world } from '@minecraft/server';
import { RailAngle } from "../data/RailAngle";
import { Rail } from "../data/Rail";
import { RailType } from "../data/RailType";
import { TransportMode } from "../data/TransportMode";
import { BetterMap } from '../data/BetterMap';
import { BlockPos } from 'util/math/BlockPos';
import { MTS } from 'MTS';
import { RenderRail } from 'render/RenderRail';
import { RailwayData } from 'data/RailwayData';

interface FirstNode {
    firstNode: BlockPos;
    firstFacing: RailAngle;
}

export class RailConnectorManager {

    public playerSelections: Map<string, FirstNode>;

    public PreviewRails: BetterMap<Player, Rail> = new BetterMap();

    constructor() {
        this.playerSelections = new Map();
    }

    async handleConnector(player : Player, railType : RailType) {
        const block = player.getBlockFromViewDirection({ maxDistance: 10 });
        
        if (!block || block.block.typeId !== 'mts:rail_node') {
            player.sendMessage('§c[MTS] Please look at a rail node');
            return;
        }

        const location = new BlockPos(block.block.location.x, block.block.location.y, block.block.location.z);
        const playerId = player.id;
        const facing = MTS.railwayData.getRailNodeAngle(location);

        if (!facing) {
            player.sendMessage('§c[MTS] Node data not found');
            return;
        }

        if (!this.playerSelections.has(playerId)) {
            this.playerSelections.set(playerId, {
                firstNode: location,
                firstFacing: facing
            });

            if (!this.PreviewRails.has(player)) {
                this.PreviewRails.set(player, new Rail(
                    BlockPos.ZERO,
                    new RailAngle(0),
                    BlockPos.ZERO,
                    new RailAngle(0),
                    RailType.IRON,
                    TransportMode.TRAIN
                ))
            }

            this.PreviewRails.get(player)!.railType = railType;
        } else {
            const selection = this.playerSelections.get(playerId);
            if (!selection) {
                player.sendMessage('§c[MTS] Selection not found');
                return;
            }
            
            const secondNode = location;
            const secondFacing = facing;

            if (selection.firstNode.equals(secondNode)) {
                player.sendMessage('§c[MTS] Cannot connect a node to itself');
                this.playerSelections.delete(playerId);
                return;
            }

            const angleDifference = Math.atan2(secondNode.getZ() - selection.firstNode.getZ(), secondNode.getX() - selection.firstNode.getX()) * 180 / Math.PI;

            const railAngleStart = RailAngle.fromAngle(selection.firstFacing.angleDegrees + (RailAngle.similarFacing(angleDifference, selection.firstFacing.angleDegrees) ? 0 : 180));
            const railAngleEnd = RailAngle.fromAngle(secondFacing.angleDegrees + (RailAngle.similarFacing(angleDifference, secondFacing.angleDegrees) ? 180 : 0));
            
            const rail1 = new Rail(
                selection.firstNode,
                railAngleStart,
                secondNode,
                railAngleEnd,
                railType,
                TransportMode.TRAIN
            );
            const rail2 = new Rail(
                secondNode,
                railAngleEnd,
                selection.firstNode,
                railAngleStart,
                railType,
                TransportMode.TRAIN
            );

			const goodRadius = rail1.goodRadius() && rail2.goodRadius();
			const isValid = rail1.isValid() && rail2.isValid();
            const isGoodLength = (rail1.getLength() > 0.1) || (rail2.getLength() > 0.1)

            if (!goodRadius) {
                player.sendMessage(`§c[MTS] Rail radius too small`);
                this.playerSelections.delete(playerId);
            }
            if (!isValid) {
                player.sendMessage('§c[MTS] Invalid rail connection');
                this.playerSelections.delete(playerId);
            }
            if (!isGoodLength) {
                player.sendMessage('§c[MTS] Rail length too small');
                this.playerSelections.delete(playerId);
            }
            if (!isGoodLength || !isValid || !goodRadius) {
                return;
            }

            await rail1.createEntities(player);
            MTS.railwayData.addRail(player, TransportMode.TRAIN, selection.firstNode, secondNode, rail1, false);
            MTS.railwayData.addRail(player, TransportMode.TRAIN, secondNode, selection.firstNode, rail2, true);
            
            const startBlock = world.getDimension("overworld").getBlock(selection.firstNode.asJson());
            const endBlock = world.getDimension("overworld").getBlock(secondNode.asJson());

            startBlock?.setPermutation(BlockPermutation.resolve("mts:rail_node", {...(startBlock?.permutation.getAllStates()), "mts:hide": 1}));
            endBlock?.setPermutation(BlockPermutation.resolve("mts:rail_node", {...(endBlock?.permutation.getAllStates()), "mts:hide": 1}));
            
            this.playerSelections.delete(playerId);
        }
    }

    UpdatePreviewRail(player: Player) {
        if (!this.playerSelections.has(player.id) || !this.PreviewRails.has(player))  return;

        const headLoc = player.getHeadLocation();
        const viewDirection = player.getViewDirection();
        const distance = 4;

        const targetPoint = new BlockPos(
            Math.ceil(headLoc.x + viewDirection.x * distance) - 1,
            Math.ceil(headLoc.y + viewDirection.y * distance),
            Math.ceil(headLoc.z + viewDirection.z * distance) - 1
        )   // 得到玩家视角发出的射线上距离相机距离为distance的点

        const PreviousPoint = this.playerSelections.get(player.id)!;

        // gParticleSystem.layParticle(
        //     particleType.show2,
        //     targetPoint,
        //     {x: 1, y: 0, z: 0},
        //     {x: 1, y: 0.05},
        //     {
        //         red: 1,
        //         green: 1,
        //         blue: 1,
        //         alpha: 0.8
        //     },
        //     2
        // )

        const targetAngle = RailwayData.getRailAngleFromPlayerFacing(player)

        const angleDifference = Math.atan2(targetPoint.getZ() - PreviousPoint.firstNode.getZ(), targetPoint.getX() - PreviousPoint.firstNode.getX()) * 180 / Math.PI;

        const railAngleStart = RailAngle.fromAngle(PreviousPoint.firstFacing.angleDegrees + (RailAngle.similarFacing(angleDifference, PreviousPoint.firstFacing.angleDegrees) ? 0 : 180));
        const railAngleEnd = RailAngle.fromAngle(targetAngle.angleDegrees + (RailAngle.similarFacing(angleDifference, targetAngle.angleDegrees) ? 180 : 0));

        const rail = this.PreviewRails.get(player)!;
        rail.reSet(
            PreviousPoint.firstNode,
            railAngleStart,
            targetPoint,
            railAngleEnd,
            rail.railType,
            TransportMode.TRAIN
        );

        RenderRail.particleRenderRailStandard(rail, 0.0625 + RenderRail.SMALL_OFFSET, 0.6, 1, player, false, 2)
    }
}
