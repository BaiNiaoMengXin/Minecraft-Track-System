import { Player, world } from "@minecraft/server";
import { BetterMap } from "data/BetterMap";
import { TransportMode } from "data/TransportMode";
import { DashboardScreen } from "screen/DashboardScreen";

export namespace MTSClient {

    export const TICKS_PER_SPEED_SOUND = 4;

    export const dashBoardScreens: BetterMap<Player, Map<TransportMode, DashboardScreen>> = new BetterMap();

    world.afterEvents.itemUse.subscribe(event => {
        const player = event.source;
        const itemType = event.itemStack.typeId;
        if (itemType.startsWith("mts:dashboard")) {
            let transportMode: TransportMode;
            switch (itemType) {
                case "mts:dashboard2":
                    transportMode = TransportMode.BOAT;
                    break;
                case "mts:dashboard3":
                    transportMode = TransportMode.CABLE_CAR;
                    break;
                case "mts:dashboard4":
                    transportMode = TransportMode.AIRPLANE;
                    break;
                default:
                    transportMode = TransportMode.TRAIN;
                    break;
            }

            if (!dashBoardScreens.has(player)) {
                dashBoardScreens.set(player, new Map());
            }
            const innerMap = dashBoardScreens.get(player)!;
            if (!innerMap.has(transportMode)) {
                innerMap.set(transportMode, new DashboardScreen(player, itemType, transportMode));
            }
            innerMap.get(transportMode)!.use();
        }
    });

    world.beforeEvents.playerLeave.subscribe(event => {
        dashBoardScreens.delete(event.player);
    });
}