import { EntityComponentTypes, Player, system, world } from "@minecraft/server";
import { Rail } from "data/Rail";
import { RailType } from "data/RailType";
import { RailwayData } from "data/RailwayData";
import { ItemBase } from "item/ItemBase";
import { ItemBlockClickingBase } from "item/ItemBlockClickingBase";
import { Items } from "Items";
import { RenderRail } from "render/RenderRail";
import { BlockPos } from "util/math/BlockPos";

export namespace MTS {

    export const railwayData: RailwayData = new RailwayData();

    let railsToStandardRender: Set<Rail> = new Set();

    const RAIL_RENDER_DURATION = 10;

    function posInPlayerRenderRange(pos: BlockPos, player: Player): boolean {
        return pos.distanceTo((player.location as any) as BlockPos) < Math.max(player.clientSystemInfo.maxRenderDistance - 2, 1) * 16;
    }

    system.runInterval(() => {
        const tempRailsToStandardRender = new Set<Rail>()
        world.getAllPlayers().forEach(player => {
            const inventory = player.getComponent(EntityComponentTypes.Inventory);
            if (inventory) {
                const itemStack = inventory.container.getItem(player.selectedSlotIndex);
                const rails = railwayData.getRails();

                if (itemStack && Array.from(registeredItem.keys()).some(id => itemStack.typeId.startsWith(id))) {
                    rails.forEach((innerMap, posStart) => {
                        if (posInPlayerRenderRange(posStart, player)) {
                            innerMap.forEach((rail, posEnd) => {
                                if (!rail.railType.hasSavedRail) {
                                	tempRailsToStandardRender.add(rail);
                                }
                            });
                        } else {
                            innerMap.forEach((rail, posEnd) => {
                                if (posInPlayerRenderRange(posEnd, player) && !rail.railType.hasSavedRail) {
                                    tempRailsToStandardRender.add(rail);
                                }
                            });
                        }
                    });
                }
            }
        })
        tempRailsToStandardRender.forEach(rail => {
        	if (rail.railType == RailType.NONE) {
        		RenderRail.particleRenderRailStandard(rail, RenderRail.SMALL_OFFSET, 1, 1, null, false, RAIL_RENDER_DURATION);
        	} else {
        		if (!railsToStandardRender.has(rail)) {
        			rail.getEntities().forEach(entity => entity.setProperty("mts:variant", rail.railType.ordinal()));
        		} else {
        			railsToStandardRender.delete(rail);
        		}
        	}
        })
        railsToStandardRender.forEach(rail => rail.getEntities().forEach(entity => entity.setProperty("mts:variant", 50)));
        railsToStandardRender = tempRailsToStandardRender;
    }, RAIL_RENDER_DURATION);


    const registeredItem: Map<string, ItemBase> = new Map();

    (function init() {
        registeredItem.set("mts:rail_connector_20", Items.RAIL_CONNECTOR_20);
        registeredItem.set("mts:rail_connector_20_one_way", Items.RAIL_CONNECTOR_20_ONE_WAY);
        registeredItem.set("mts:rail_connector_40", Items.RAIL_CONNECTOR_40);
        registeredItem.set("mts:rail_connector_40_one_way", Items.RAIL_CONNECTOR_40_ONE_WAY);
        registeredItem.set("mts:rail_connector_60", Items.RAIL_CONNECTOR_60);
        registeredItem.set("mts:rail_connector_60_one_way", Items.RAIL_CONNECTOR_60_ONE_WAY);
        registeredItem.set("mts:rail_connector_80", Items.RAIL_CONNECTOR_80);
        registeredItem.set("mts:rail_connector_80_one_way", Items.RAIL_CONNECTOR_80_ONE_WAY);
        registeredItem.set("mts:rail_connector_120", Items.RAIL_CONNECTOR_120);
        registeredItem.set("mts:rail_connector_120_one_way", Items.RAIL_CONNECTOR_120_ONE_WAY);
        registeredItem.set("mts:rail_connector_platform", Items.RAIL_CONNECTOR_PLATFORM);
        registeredItem.set("mts:rail_connector_siding", Items.RAIL_CONNECTOR_SIDING);
        registeredItem.set("mts:rail_connector_turn_back", Items.RAIL_CONNECTOR_TURN_BACK);
        registeredItem.set("mts:bridge_creator_3", Items.BRIDGE_CREATOR_3);
        registeredItem.set("mts:bridge_creator_5", Items.BRIDGE_CREATOR_5);
        registeredItem.set("mts:bridge_creator_7", Items.BRIDGE_CREATOR_7);
        registeredItem.set("mts:bridge_creator_9", Items.BRIDGE_CREATOR_9);

        system.beforeEvents.startup.subscribe((event) => {
            event.itemComponentRegistry.registerCustomComponent("mts:on_use_on", {
                onUseOn: (itemComponentUseOnEvent, customComponentParameters) => {
                    const typeId = itemComponentUseOnEvent.itemStack.typeId;
                    const isBlockClicking = registeredItem.has(typeId) ? (registeredItem.get(typeId) instanceof ItemBlockClickingBase) : (typeId.endsWith(ItemBlockClickingBase.SELECTED_END_FLAG) && registeredItem.has(typeId.substring(0, typeId.length - ItemBlockClickingBase.SELECTED_END_FLAG.length)) && (registeredItem.get(typeId.substring(0, typeId.length - ItemBlockClickingBase.SELECTED_END_FLAG.length)) instanceof ItemBlockClickingBase));

                    const item = registeredItem.get(typeId) ?? (isBlockClicking ? registeredItem.get(typeId.substring(0, typeId.length - ItemBlockClickingBase.SELECTED_END_FLAG.length)) : undefined);
                    if (isBlockClicking || item) {
                        item!.useOn(itemComponentUseOnEvent);
                    }
                }
            })
        });

        system.runInterval(() => {
            world.sendMessage("auto saving Minecraft Track System game data...");// debug
            railwayData.autoSave();
        }, 20 * 60 * 5);
        world.beforeEvents.playerLeave.subscribe(event => {
            system.run(() => {
                railwayData.fullSave();
            });
        })
    })()
}
