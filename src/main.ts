import { BlockPermutation, CommandPermissionLevel, RGBA, system, Vector3, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { MTS } from "MTS";
import { MTSClient } from "MTSClient";
import { BlockNode } from "block/BlockNode";
import { RailEntry } from "data/RailwayData";
import { TransportMode } from "data/TransportMode";
import { CustomResources } from "extensions/CustomResources";
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
    
    if (BlockNode.isNode(block)) {
        system.run(() => MTS.railwayData.removeNode(player, new BlockPos(block.location.x, block.location.y, block.location.z)));
    }
});

world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, player } = event;
    
    if (BlockNode.isNode(block)) {
        BlockNode.updateRailNodeState(player, new BlockPos(block.location));
    }
});

system.runInterval(() => {
    MTS.railwayData.simulateTrains()
}, 1)

