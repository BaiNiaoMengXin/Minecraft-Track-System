import { world, system, BlockPermutation, Player, Vector3, RGBA } from '@minecraft/server';
import { RailConnectorManager } from "./rail/RailConnectorManager";
import { ParticleSystem, particleType } from "./rail/ParticleSystem";
import { RailwayData } from "./data/RailwayData.js";
import { RailType } from 'data/RailType';
import { GetPlayerById, Position, TickerManager } from 'data/Base';
import { DataCache } from 'data/DataCache';
import { ExtensionRegistry } from 'ExtensionRegistry/ExtensionRegistry';
import { itemBrush } from 'item/itemBrush';
import { ShardDataBase } from 'packet/ShardDataSave';
import { BlockPos } from 'util/math/BlockPos';
import { TransportMode } from 'data/TransportMode';
import { MTSClient } from 'MTSClient';
import { MTS } from 'MTS';
import { Vec3 } from 'util/math/Vec3';
import { Mth } from 'util/math/Mth';
import { decode, encode } from 'libs/MessagePack/index';
import { TrainDashboardClient } from 'screen/TrainDashboardClient';

export const DEBUG: boolean = true;


export let gSharedDataBase: ShardDataBase<string>

world.afterEvents.worldLoad.subscribe(event => {
    gSharedDataBase = new ShardDataBase<string>("mts");
})


export function LoadData() {
    system.run(() => {
        const sharedDataBase2 = new ShardDataBase<string>("mts")
        const data = sharedDataBase2.get("RailwayData")
        if (data) {
            const packed = new Uint8Array(Array.from(data as string, char => char.charCodeAt(0)));
            MTS.railwayData.load(decode(packed, { useBigInt64: true }) as any);
            world.sendMessage("§a铁路数据、存档已加载完成。");
        }
    });
}

export function SaveData() {
    function bufferToStr(arr: Uint8Array) {
        const chunkSize = 1000;
        let result = '';
        
        for (let i = 0; i < arr.length; i += chunkSize) {
            const chunk = arr.slice(i, i + chunkSize);
            result += String.fromCharCode(...chunk);
        }
        
        return result;
    }
    const packed = encode(MTS.railwayData.toMessagePack(), { useBigInt64: true })

    gSharedDataBase.set("RailwayData", bufferToStr(packed))
    gSharedDataBase.save()
    world.sendMessage("§a铁路数据、存档已保存完成。");
}

export function ClearDebugData() {
    gSharedDataBase.set("RailwayData", undefined as any)
    gSharedDataBase.save()
    world.sendMessage("§c铁路数据、存档已强制清空。");
}













export const gRailConnectorManager = new RailConnectorManager();
export const gExtensionRegistry = new ExtensionRegistry();


world.beforeEvents.playerLeave.subscribe((event) => {
    // ClearExtRegistry
    if (gExtensionRegistry.getAllRailExtension()) {
        world.scoreboard.removeObjective("mtsExtensionRegistry")
    }
});

world.afterEvents.playerBreakBlock.subscribe((event) => {
    const { block, player } = event;
    
    if (block.typeId === 'mts:rail_node') {
        MTS.railwayData.removeRailNodeBlock(player, new BlockPos(block.location.x, block.location.y, block.location.z));
    }
});

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, player } = event;
    
    if (block.typeId === 'mts:rail_node') {
        MTS.railwayData.addRailNodeBlock(player, new BlockPos(block.location));
    }

    if (block.typeId === 'mts:escalator') {
        const playerRotation = player.getRotation().y;
        let facing = 0;
        
        if (playerRotation >= -45 && playerRotation < 45) facing = 90;      // 北
        else if (playerRotation >= 45 && playerRotation < 135) facing = 0;  // 东
        else if (playerRotation >= 135 || playerRotation < -135) facing = 270; // 南
        else facing = 180; // 西
        
        block.setPermutation(BlockPermutation.resolve("mts:escalator", {
        "mts:facing": facing, "mts:escalator": "step_landing"}));


        let rightBlockPos: Position;
        if (facing === 180){
            rightBlockPos = { x: block.location.x, 
                              y: block.location.y,
                              z: block.location.z + 1 };
        } else if (facing === 270){
            rightBlockPos = { x: block.location.x + 1,
                              y: block.location.y,
                              z: block.location.z };
        } else if (facing === 0){
            rightBlockPos = { x: block.location.x,
                              y: block.location.y,
                              z: block.location.z - 1 };
        } else {
            rightBlockPos = { x: block.location.x - 1,
                              y: block.location.y,
                              z: block.location.z };
        }

        function offset(a:Position): Position {
            return {x: a.x, y: a.y + 1, z: a.z}
        }

        const Dismension = world.getDimension("overworld")
        if (!Dismension.getBlock(rightBlockPos) && (Dismension.getBlock(rightBlockPos)?.typeId != "minecraft:air" || Dismension.getBlock(rightBlockPos)?.typeId != "air")) {
            block.setType("minecraft:air")
        } else {
            Dismension.setBlockPermutation(offset(block.location), 
                    BlockPermutation.resolve("mts:escalator", {
                    "mts:facing": facing, "mts:escalator": "side_landing_left"}));
            Dismension.setBlockPermutation(rightBlockPos, 
                    BlockPermutation.resolve("mts:escalator", {
                    "mts:facing": facing, "mts:escalator": "step_landing"}));
            Dismension.setBlockPermutation(offset(rightBlockPos), 
                    BlockPermutation.resolve("mts:escalator2", {
                    "mts:facing": facing, "mts:escalator2": "side_landing_right"}));
        }
    }
});

world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    
    const ItemType = itemStack.typeId;

    if (ItemType === 'mts:rail_connector_20') {
        gRailConnectorManager.handleConnector(player, RailType.WOODEN);
    } else if (ItemType === 'mts:rail_connector_40') {
        gRailConnectorManager.handleConnector(player, RailType.STONE);
    } else if (ItemType === 'mts:rail_connector_60') {
        gRailConnectorManager.handleConnector(player, RailType.EMERALD);
    } else if (ItemType === 'mts:rail_connector_80') {
        gRailConnectorManager.handleConnector(player, RailType.IRON);
    } else if (ItemType === 'mts:rail_connector_120') {
        gRailConnectorManager.handleConnector(player, RailType.OBSIDIAN);
    } else if (ItemType === 'mts:rail_connector_platform') {
        gRailConnectorManager.handleConnector(player, RailType.PLATFORM);
    } else if (ItemType === 'mts:rail_connector_siding') {
        gRailConnectorManager.handleConnector(player, RailType.SIDING);
    } else if (ItemType === 'mts:rail_connector_turn_back') {
        gRailConnectorManager.handleConnector(player, RailType.TURN_BACK);
    }
    else if (ItemType === "mts:bridge_creator_3") {
    //     gRailBuilder.UseItem(player, BuilderType.Bridge_3);
    // } else if (ItemType === "mts:bridge_creator_5") {
    //     gRailBuilder.UseItem(player, BuilderType.Bridge_5);
    // } else if (ItemType === "mts:bridge_creator_7") {
    //     gRailBuilder.UseItem(player, BuilderType.Bridge_7);
    // } else if (ItemType === "mts:bridge_creator_9") {
    //     gRailBuilder.UseItem(player, BuilderType.Bridge_9);
    } 
    else if (ItemType === "mts:brush") {
        itemBrush.itemUse(player, itemStack);
    }
});

system.runInterval(() => {
    ParticleSystem.update();
    MTS.railwayData.simulateTrains()
}, 1)

system.runInterval(() => {
    function XZPosDistSqr(a: Position, b: Position): number {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return dx * dx + dz * dz;
    }
    MTSClient.dashBoardScreens.forEach((dashboard, player) => {
        const secondPos = dashboard.playerSecondChoicesPos;
        if (!secondPos) return;

        const currentPos = TrainDashboardClient.getPlayerFacingPos(player).asJson();
        currentPos.z += 0.5;
        currentPos.x += 0.5;

        const secondPos_Copy: Position = {x: secondPos.getX() + 0.5, y: secondPos.getY(), z: secondPos.getZ() + 0.5};

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

        const line1W = lineWidth * Math.max(Math.pow(XZPosDistSqr(Vec3.fromVector3(line1Pos), Vec3.fromVector3(currentPos)), 1/4), 1);
        const line2W = lineWidth * Math.max(Math.pow(XZPosDistSqr(Vec3.fromVector3(line2Pos), Vec3.fromVector3(currentPos)), 1/4), 1);
        const line3W = lineWidth * Math.max(Math.pow(XZPosDistSqr(Vec3.fromVector3(line3Pos), Vec3.fromVector3(currentPos)), 1/4), 1);
        const line4W = lineWidth * Math.max(Math.pow(XZPosDistSqr(Vec3.fromVector3(line4Pos), Vec3.fromVector3(currentPos)), 1/4), 1);

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


system.runInterval(() => {
    gRailConnectorManager.playerSelections.forEach((firstNode, player) => {
        gRailConnectorManager.UpdatePreviewRail(GetPlayerById(player)!);
    });
}, 2)







system.runInterval(() => {
    SaveData();
}, 60*5*20)// every 5 minutes






system.runInterval(() => {
    TickerManager.removeAllTickers()
}, 30*20)// every 30 seconds to remove unused tickers




if (DEBUG) {
system.runTimeout(() => {
    world.sendMessage("[MTS] Welcome to test MTS Alpha");
}, 20);
}
