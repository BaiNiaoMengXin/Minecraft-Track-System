import { Player, system, world } from "@minecraft/server";
import { MTS } from "MTS";

export namespace MTSClient {

    // export const dashBoardScreens: Map<Player, TrainDashboard> = new HashMap();

    // world.afterEvents.playerJoin.subscribe(event => {
    //     const player = world.getAllPlayers().find(player => player.id == event.playerId);
    //     if (!player) {
    //         throw new Error("Can not find player instance");
    //     } else {
    //         dashBoardScreens.set(player, new TrainDashboard(MTS.railwayData.dataCache, player));
    //     }
    // })
    
    // world.beforeEvents.playerLeave.subscribe(event => {
    //     const player = event.player;
    //     dashBoardScreens.delete(player);
    // })
}