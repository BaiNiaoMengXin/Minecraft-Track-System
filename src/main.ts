import { BlockPermutation, CommandPermissionLevel, RGBA, system, Vector3, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { MTS } from "MTS";
import { MTSClient } from "MTSClient";
import { BlockNode } from "block/BlockNode";
import { RailEntry } from "data/RailwayData";
import { TransportMode } from "data/TransportMode";
import { CustomResources } from "extensions/CustomResources";
import { itemBrush } from "item/itemBrush";
import { decode, encode } from "libs/MessagePack/index";
import { ParticleSystem, particleType } from "rail/ParticleSystem";
import { TrainDashboardClient } from "screen/TrainDashboardClient";
import { BlockPos } from "util/math/BlockPos";
import { Mth } from "util/math/Mth";
import { Vec3 } from "util/math/Vec3";

world.afterEvents.worldLoad.subscribe(event => {
    system.runTimeout(() => {
        try {
            CustomResources.reload()
        } catch (e) {
            console.error(e)
        }
    }, 20 * 2);
});

// TODO load railwayData

world.beforeEvents.playerBreakBlock.subscribe((event) => {
    const { block, player } = event;
    
    if (block.typeId === BlockNode.RAIL_NODE_BLOCK_KEY_NAME) {
        MTS.railwayData.removeNode(player, new BlockPos(block.location.x, block.location.y, block.location.z), TransportMode.TRAIN);
    }
});

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, player } = event;
    
    if (block.typeId === BlockNode.RAIL_NODE_BLOCK_KEY_NAME) {
        BlockNode.updateRailNodeState(player, new BlockPos(block.location));
    }
});

world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    
    const itemType = itemStack.typeId;
    
    if (itemType === "mts:brush") {
        itemBrush.itemUse(player, itemStack);
    }
});

system.runInterval(() => {
    MTS.railwayData.simulateTrains()
}, 1)

system.runInterval(() => {
    function XZPosDistSqr(a: Vector3, b: Vector3): number {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return dx * dx + dz * dz;
    }
    MTSClient.dashBoardScreens.forEach((dashboard, player) => {
        const secondPos = dashboard.playerSecondChoicesPos;
        if (!secondPos) return;

        const currentPos = TrainDashboardClient.getPlayerFacingPos(player);
        currentPos.z += 0.5;
        currentPos.x += 0.5;

        const secondPos_Copy: Vector3 = {x: secondPos.x + 0.5, y: secondPos.y, z: secondPos.z + 0.5};

        const playerPos = player.location;


        const lineWidth = 0.05;
        const lineColor = {
            red: 0,
            green: 0.9,
            blue: 0,
            alpha: 0.8
        };
        const lineY_L = 64;
        
        const line1Pos = {x: secondPos_Copy.x, y: playerPos.y, z: secondPos_Copy.z};
        const line2Pos = {x: currentPos.x, y: playerPos.y, z: secondPos_Copy.z};
        const line3Pos = {x: secondPos_Copy.x, y: playerPos.y, z: currentPos.z};
        const line4Pos = {x: currentPos.x, y: playerPos.y, z: currentPos.z};

        const line1W = lineWidth * Math.max(Math.pow(XZPosDistSqr(line1Pos, currentPos), 1/4), 1);
        const line2W = lineWidth * Math.max(Math.pow(XZPosDistSqr(line2Pos, currentPos), 1/4), 1);
        const line3W = lineWidth * Math.max(Math.pow(XZPosDistSqr(line3Pos, currentPos), 1/4), 1);
        const line4W = lineWidth * Math.max(Math.pow(XZPosDistSqr(line4Pos, currentPos), 1/4), 1);

        ParticleSystem.layParticle(
            particleType.show,
            line1Pos,
            {x: 0, y: 1, z: 0},
            {x: line1W, y: lineY_L},
            lineColor,
            2
        )
        ParticleSystem.layParticle(
            particleType.show,
            line2Pos,
            {x: 0, y: 1, z: 0},
            {x: line2W, y: lineY_L},
            lineColor,
            2
        )
        ParticleSystem.layParticle(
            particleType.show,
            line3Pos,
            {x: 0, y: 1, z: 0},
            {x: line3W, y: lineY_L},
            lineColor,
            2
        )
        ParticleSystem.layParticle(
            particleType.show,
            line4Pos,
            {x: 0, y: 1, z: 0},
            {x: line4W, y: lineY_L},
            lineColor,
            2
        )

        //Wall

        const wallWidthScaling = 0.5;
        const wallColor: RGBA = {red: 0.9, green: 0.9, blue: 0.9, alpha: 0.5};
        const wallW = Math.abs(line1Pos.x - line2Pos.x) * wallWidthScaling;
        const wallA = Math.abs(line1Pos.z - line3Pos.z) * wallWidthScaling;

        const pitch = Mth.toRadians(90)

        const yaw1 = Mth.toRadians(90)
        const yaw2 = Mth.toRadians(0)

        const Wall1Rot = {
            x: Math.cos(pitch) * Math.cos(yaw1),
            y: Math.sin(pitch),
            z: Math.cos(pitch) * Math.sin(yaw1)
        }

        const Wall2Rot = {
            x: Math.cos(pitch) * Math.cos(yaw2),
            y: Math.sin(pitch),
            z: Math.cos(pitch) * Math.sin(yaw2)
        }

        ParticleSystem.layParticle(
            particleType.show2,
            Vec3.fromVector3(line1Pos).lerp(Vec3.fromVector3(line2Pos), 0.5),
            {x: 0, y: 1, z: 0},
            {x: wallW, y: lineY_L},
            wallColor,
            2
        )
        ParticleSystem.layParticle(
            particleType.show2,
            Vec3.fromVector3(line3Pos).lerp(Vec3.fromVector3(line4Pos), 0.5),
            {x: 0, y: 1, z: 0},
            {x: wallW, y: lineY_L},
            wallColor,
            2
        )
        ParticleSystem.layParticle(
            particleType.show2,
            Vec3.fromVector3(line2Pos).lerp(Vec3.fromVector3(line4Pos), 0.5),
            {x: 0.1, y: 1.1, z: 0},
            {x: wallA, y: lineY_L},
            wallColor,
            2
        )
        ParticleSystem.layParticle(
            particleType.show2,
            Vec3.fromVector3(line1Pos).lerp(Vec3.fromVector3(line3Pos), 0.5),
            {x: 0.1, y: 1.1, z: 0},
            {x: wallA, y: lineY_L},
            wallColor,
            2
        )
    })
}, 4)
