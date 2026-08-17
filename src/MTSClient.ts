import { Player, world } from "@minecraft/server";
import { BetterMap } from "data/BetterMap";
import { DashboardScreen } from "screen/DashboardScreen";

export namespace MTSClient {

    export const TICKS_PER_SPEED_SOUND = 4;

    export const dashBoardScreens: BetterMap<Player, DashboardScreen> = new BetterMap();

    world.afterEvents.itemUse.subscribe(event => {
        const player = event.source;
        const itemType = event.itemStack.typeId;
        if (itemType === DashboardScreen.ITEM_TYPE_ID) {
            if (!dashBoardScreens.has(player)) {
                dashBoardScreens.set(player, new DashboardScreen(player));
            }
            dashBoardScreens.get(player)!.use();
        }
    });

    world.beforeEvents.playerLeave.subscribe(event => {
        dashBoardScreens.delete(event.player);
    });
}