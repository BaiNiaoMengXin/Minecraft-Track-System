import { Player, world } from "@minecraft/server";
import { BetterMap } from "data/BetterMap";
import { MTS } from "MTS";
import { TrainDashboardClient } from "screen/TrainDashboardClient";

export namespace MTSClient {

    export const TICKS_PER_SPEED_SOUND = 4;

    export const dashBoardScreens: BetterMap<Player, TrainDashboardClient> = new BetterMap();

    world.afterEvents.itemUse.subscribe(event => {
        const player = event.source;
        const itemType = event.itemStack.typeId;
        if (itemType === TrainDashboardClient.ITEM_TYPE_ID) {
            if (!dashBoardScreens.has(player)) {
                dashBoardScreens.set(player, new TrainDashboardClient(player));
            }
            dashBoardScreens.get(player)!.use();
        }
    });
}