import { ItemStack, Player, system, world } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { ClearDebugData, LoadData, SaveData } from "main";

export class itemBrush {
    static itemUse(player: Player, item: ItemStack): void {
        // const block = player.getBlockFromViewDirection({ maxDistance: 10 })?.block;
        // if (player.isSneaking && block && block.typeId == "mts:rail_node") {
        //     const SelectedRailPage = new ActionFormData()
        //         .title("切换轨道样式")

        //     // updateButttons
        //     const RailExtensions = gExtensionRegistry.getAllRailExtension();
        //     if (!RailExtensions) return;
            
        //     for (const aRailStyle of RailExtensions) {
        //         SelectedRailPage.button(aRailStyle.name);
        //     }

        //     SelectedRailPage.show(player).then((response) => {

        //         console.log(response.selection);
                
        //         const theNodePos = block.location;
        //         const theRailStyle = RailExtensions[response.selection!];

        //         if (gRailwayData.rails.has(theNodePos))
        //         {
        //             for (const aRail of gRailwayData.rails.get(theNodePos)!.values()) {
        //                 aRail.destroyEntities();
        //                 aRail.createEntitiesExt(theRailStyle, player);
        //             }
        //         }

        //         for (const aRailMap of gRailwayData.rails.values()) {
        //             if (aRailMap.has(theNodePos)) {
        //                 const aRail = aRailMap.get(theNodePos)!;
        //                 aRail.destroyEntities();
        //                 aRail.createEntitiesExt(theRailStyle, player);
        //             }
        //         }
        //     })
        // }
        // else
        // {


            const DebugPage = new ActionFormData()
                .title("调试")
                .button("§c强制清空存档")
                .button("§a加载存档")
                .button("§a存档")

            DebugPage.show(player).then((response) => {
                if (response.selection === 0) {
                    ClearDebugData()
                }
                else if (response.selection === 1) {
                    LoadData()
                }
                else if (response.selection === 2) {
                    SaveData()
                }
            });
        // }
    }
}