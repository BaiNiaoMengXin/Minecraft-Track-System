import { BlockVolume, Entity, EntityComponentTypes, Player, system, TickingArea, Vector3, world } from "@minecraft/server";
import { BlockBase } from "block/BlockBase";
import { EntityInsideTriggeredBlock } from "block/EntityInsideTriggeredBlock";
import { Blocks } from "Blocks";
import { Rail } from "data/Rail";
import { RailType } from "data/RailType";
import { RailwayData } from "data/RailwayData";
import { ItemBase } from "item/ItemBase";
import { ItemBlockClickingBase } from "item/ItemBlockClickingBase";
import { Items } from "Items";
import { RenderRail } from "render/RenderRail";
import { BlockPos } from "util/math/BlockPos";
import { Vec3 } from "util/math/Vec3";

export namespace MTS {

    export const railwayData: RailwayData = new RailwayData();

    let railsToStandardRender: Set<Rail> = new Set();
    let commonTickingAreaForEntities: TickingArea | undefined = undefined;
    export const COMMON_TICKING_AREA_CENTER_POS: Vector3 = { x: 7, y: 7, z: 7 };

    const RAIL_RENDER_DURATION = 10;

    function posInPlayerRenderRange(pos: BlockPos, player: Player): boolean {
        return pos.distanceTo((player.location as any) as BlockPos) < Math.max(player.clientSystemInfo.maxRenderDistance - 2, 1) * 16;
    }

    system.runInterval(() => {
        const tempRailsToStandardRender = new Set<Rail>()
        const rails = railwayData.getRails();


        world.getAllPlayers().forEach(player => {
            const itemStack = player.getComponent(EntityComponentTypes.Inventory)?.container.getItem(player.selectedSlotIndex);
            if (itemStack) {
                const typeId = itemStack.typeId;

                const isBlockClicking = registeredItem.has(typeId) ? (registeredItem.get(typeId) instanceof ItemBlockClickingBase) : (typeId.endsWith(ItemBlockClickingBase.SELECTED_END_FLAG) && registeredItem.has(typeId.substring(0, typeId.length - ItemBlockClickingBase.SELECTED_END_FLAG.length)) && (registeredItem.get(typeId.substring(0, typeId.length - ItemBlockClickingBase.SELECTED_END_FLAG.length)) instanceof ItemBlockClickingBase));
                if (isBlockClicking) {
                    rails.forEach((innerMap, posStart) => {
                            innerMap.forEach((rail, posEnd) => {
                            if (posInPlayerRenderRange(posStart, player) || posInPlayerRenderRange(posEnd, player)) {
                                if (!rail.railType.hasSavedRail) {
                                	tempRailsToStandardRender.add(rail);
                                }
                                RenderRail.particleRenderSignalsStandard(rail, posStart, posEnd, player, RAIL_RENDER_DURATION);
                                }
                            });
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
        railsToStandardRender.forEach(rail => {
            const entities = rail.getEntities() as Set<Entity>;
            entities.forEach(entity => {
                if (entity.isValid) {
                    entity.setProperty("mts:variant", 50)
                } else {
                    entities.delete(entity);
                }
            });
        });
        railsToStandardRender = tempRailsToStandardRender;
    }, RAIL_RENDER_DURATION);


    export const registeredItem: Map<string, ItemBase> = new Map();
    export const registeredBlock: Map<string, BlockBase> = new Map();

    (function init() {
        registeredItem.set("mts:lift_buttons_link_connector", Items.LIFT_BUTTONS_LINK_CONNECTOR);
        registeredItem.set("mts:lift_buttons_link_remover", Items.LIFT_BUTTONS_LINK_REMOVER);
        registeredItem.set("mts:lift_refresher", Items.LIFT_REFRESHER);

        registeredBlock.set("mts:lift_buttons_1", Blocks.LIFT_BUTTONS_1);
        registeredBlock.set("mts:lift_track_floor_1", Blocks.LIFT_TRACK_FLOOR_1);

        registeredBlock.set("mts:ticket_barrier_entrance_1", Blocks.TICKET_BARRIER_ENTRANCE_1);
        registeredBlock.set("mts:ticket_barrier_exit_1", Blocks.TICKET_BARRIER_EXIT_1);
        registeredBlock.set("mts:ticket_machine", Blocks.TICKET_MACHINE);
        registeredBlock.set("mts:ticket_processor", Blocks.TICKET_PROCESSOR);
        registeredBlock.set("mts:ticket_processor_entrance", Blocks.TICKET_PROCESSOR_ENTRANCE);
        registeredBlock.set("mts:ticket_processor_exit", Blocks.TICKET_PROCESSOR_EXIT);
        registeredBlock.set("mts:ticket_processor_enquiry", Blocks.TICKET_PROCESSOR_ENQUIRY);

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
		registeredItem.set("mts:rail_connector_160", Items.RAIL_CONNECTOR_160);
		registeredItem.set("mts:rail_connector_160_one_way", Items.RAIL_CONNECTOR_160_ONE_WAY);
		registeredItem.set("mts:rail_connector_200", Items.RAIL_CONNECTOR_200);
		registeredItem.set("mts:rail_connector_200_one_way", Items.RAIL_CONNECTOR_200_ONE_WAY);
		registeredItem.set("mts:rail_connector_300", Items.RAIL_CONNECTOR_300);
		registeredItem.set("mts:rail_connector_300_one_way", Items.RAIL_CONNECTOR_300_ONE_WAY);
        registeredItem.set("mts:rail_connector_platform", Items.RAIL_CONNECTOR_PLATFORM);
        registeredItem.set("mts:rail_connector_siding", Items.RAIL_CONNECTOR_SIDING);
        registeredItem.set("mts:rail_connector_turn_back", Items.RAIL_CONNECTOR_TURN_BACK);
        registeredItem.set("mts:rail_remover", Items.RAIL_REMOVER);
        registeredItem.set("mts:signal_connector_white", Items.SIGNAL_CONNECTOR_WHITE);
        registeredItem.set("mts:signal_connector_orange", Items.SIGNAL_CONNECTOR_ORANGE);
        registeredItem.set("mts:signal_connector_magenta", Items.SIGNAL_CONNECTOR_MAGENTA);
        registeredItem.set("mts:signal_connector_light_blue", Items.SIGNAL_CONNECTOR_LIGHT_BLUE);
        registeredItem.set("mts:signal_connector_yellow", Items.SIGNAL_CONNECTOR_YELLOW);
        registeredItem.set("mts:signal_connector_lime", Items.SIGNAL_CONNECTOR_LIME);
        registeredItem.set("mts:signal_connector_pink", Items.SIGNAL_CONNECTOR_PINK);
        registeredItem.set("mts:signal_connector_gray", Items.SIGNAL_CONNECTOR_GRAY);
        registeredItem.set("mts:signal_connector_light_gray", Items.SIGNAL_CONNECTOR_LIGHT_GRAY);
        registeredItem.set("mts:signal_connector_cyan", Items.SIGNAL_CONNECTOR_CYAN);
        registeredItem.set("mts:signal_connector_purple", Items.SIGNAL_CONNECTOR_PURPLE);
        registeredItem.set("mts:signal_connector_blue", Items.SIGNAL_CONNECTOR_BLUE);
        registeredItem.set("mts:signal_connector_brown", Items.SIGNAL_CONNECTOR_BROWN);
        registeredItem.set("mts:signal_connector_green", Items.SIGNAL_CONNECTOR_GREEN);
        registeredItem.set("mts:signal_connector_red", Items.SIGNAL_CONNECTOR_RED);
        registeredItem.set("mts:signal_connector_black", Items.SIGNAL_CONNECTOR_BLACK);
        registeredItem.set("mts:signal_remover_white", Items.SIGNAL_REMOVER_WHITE);
        registeredItem.set("mts:signal_remover_orange", Items.SIGNAL_REMOVER_ORANGE);
        registeredItem.set("mts:signal_remover_magenta", Items.SIGNAL_REMOVER_MAGENTA);
        registeredItem.set("mts:signal_remover_light_blue", Items.SIGNAL_REMOVER_LIGHT_BLUE);
        registeredItem.set("mts:signal_remover_yellow", Items.SIGNAL_REMOVER_YELLOW);
        registeredItem.set("mts:signal_remover_lime", Items.SIGNAL_REMOVER_LIME);
        registeredItem.set("mts:signal_remover_pink", Items.SIGNAL_REMOVER_PINK);
        registeredItem.set("mts:signal_remover_gray", Items.SIGNAL_REMOVER_GRAY);
        registeredItem.set("mts:signal_remover_light_gray", Items.SIGNAL_REMOVER_LIGHT_GRAY);
        registeredItem.set("mts:signal_remover_cyan", Items.SIGNAL_REMOVER_CYAN);
        registeredItem.set("mts:signal_remover_purple", Items.SIGNAL_REMOVER_PURPLE);
        registeredItem.set("mts:signal_remover_blue", Items.SIGNAL_REMOVER_BLUE);
        registeredItem.set("mts:signal_remover_brown", Items.SIGNAL_REMOVER_BROWN);
        registeredItem.set("mts:signal_remover_green", Items.SIGNAL_REMOVER_GREEN);
        registeredItem.set("mts:signal_remover_red", Items.SIGNAL_REMOVER_RED);
        registeredItem.set("mts:signal_remover_black", Items.SIGNAL_REMOVER_BLACK);
        registeredItem.set("mts:bridge_creator_3", Items.BRIDGE_CREATOR_3);
        registeredItem.set("mts:bridge_creator_5", Items.BRIDGE_CREATOR_5);
        registeredItem.set("mts:bridge_creator_7", Items.BRIDGE_CREATOR_7);
        registeredItem.set("mts:bridge_creator_9", Items.BRIDGE_CREATOR_9);
        registeredItem.set("mts:tunnel_creator_4_3", Items.TUNNEL_CREATOR_4_3);
        registeredItem.set("mts:tunnel_creator_4_5", Items.TUNNEL_CREATOR_4_5);
        registeredItem.set("mts:tunnel_creator_4_7", Items.TUNNEL_CREATOR_4_7);
        registeredItem.set("mts:tunnel_creator_4_9", Items.TUNNEL_CREATOR_4_9);
        registeredItem.set("mts:tunnel_creator_5_3", Items.TUNNEL_CREATOR_5_3);
        registeredItem.set("mts:tunnel_creator_5_5", Items.TUNNEL_CREATOR_5_5);
        registeredItem.set("mts:tunnel_creator_5_7", Items.TUNNEL_CREATOR_5_7);
        registeredItem.set("mts:tunnel_creator_5_9", Items.TUNNEL_CREATOR_5_9);
        registeredItem.set("mts:tunnel_creator_6_3", Items.TUNNEL_CREATOR_6_3);
        registeredItem.set("mts:tunnel_creator_6_5", Items.TUNNEL_CREATOR_6_5);
        registeredItem.set("mts:tunnel_creator_6_7", Items.TUNNEL_CREATOR_6_7);
        registeredItem.set("mts:tunnel_creator_6_9", Items.TUNNEL_CREATOR_6_9);
        registeredItem.set("mts:tunnel_wall_creator_4_3", Items.TUNNEL_WALL_CREATOR_4_3);
        registeredItem.set("mts:tunnel_wall_creator_4_5", Items.TUNNEL_WALL_CREATOR_4_5);
        registeredItem.set("mts:tunnel_wall_creator_4_7", Items.TUNNEL_WALL_CREATOR_4_7);
        registeredItem.set("mts:tunnel_wall_creator_4_9", Items.TUNNEL_WALL_CREATOR_4_9);
        registeredItem.set("mts:tunnel_wall_creator_5_3", Items.TUNNEL_WALL_CREATOR_5_3);
        registeredItem.set("mts:tunnel_wall_creator_5_5", Items.TUNNEL_WALL_CREATOR_5_5);
        registeredItem.set("mts:tunnel_wall_creator_5_7", Items.TUNNEL_WALL_CREATOR_5_7);
        registeredItem.set("mts:tunnel_wall_creator_5_9", Items.TUNNEL_WALL_CREATOR_5_9);
        registeredItem.set("mts:tunnel_wall_creator_6_3", Items.TUNNEL_WALL_CREATOR_6_3);
        registeredItem.set("mts:tunnel_wall_creator_6_5", Items.TUNNEL_WALL_CREATOR_6_5);
        registeredItem.set("mts:tunnel_wall_creator_6_7", Items.TUNNEL_WALL_CREATOR_6_7);
        registeredItem.set("mts:tunnel_wall_creator_6_9", Items.TUNNEL_WALL_CREATOR_6_9);

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

        world.beforeEvents.playerBreakBlock.subscribe(event => {
            if (event.block.typeId.startsWith("mts:")) {
                registeredBlock.get(event.block.typeId)?.playerWillDestroy(event);
            }
        });

        world.beforeEvents.playerInteractWithBlock.subscribe(event => {
            if (event.block.typeId.startsWith("mts:")) {
                if (MTS.railwayData.railwayDataCoolDownModule.canInteract(event.player)) {
                    system.run(() => {
                        registeredBlock.get(event.block.typeId)?.use(event);
                    });
                }
                MTS.railwayData.railwayDataCoolDownModule.onPlayerWillInteract(event.player);
            }
        });

        const entityInsideableBlockTypes: Array<string> = []
        registeredBlock.forEach((instance, typeId) => {
            if ((instance as EntityInsideTriggeredBlock).isEntityInsideTriggeredBlock) {
                entityInsideableBlockTypes.push(typeId);
            }
        });

        system.runInterval(() => {
            const dimension = world.getDimension("overworld");

            for (const player of world.getAllPlayers()) {
                const boxCenter = player.location;
                const blocks = dimension.getBlocks(
                    new BlockVolume({ x: boxCenter.x - 0.5, y: boxCenter.y - 0.5, z: boxCenter.z - 0.5 }, { x: boxCenter.x + 0.5, y: boxCenter.y + 0.5, z: boxCenter.z + 0.5 }),
                    { includeTypes: entityInsideableBlockTypes }
                );
                for (const pos of blocks.getBlockLocationIterator()) {
                    const block = dimension.getBlock(pos)!;
                    (registeredBlock.get(block.typeId) as EntityInsideTriggeredBlock).entityInside(player, block);
                }
            }
        }, 2)

        world.beforeEvents.entityHurt.subscribe(event => {
            if (event.damageSource.cause != "none" && event.damageSource.cause != "selfDestruct") {
                event.cancel = true;
            }
        }, { entityFilter: { families: ["mts"] } });


        world.afterEvents.worldLoad.subscribe(() => {
            const promise = world.tickingAreaManager.createTickingArea("mts_public_ticking_area", {
                from: { x: 0, y: 0, z: 0 },
                to: { x: 15, y: 15, z: 15 },
                dimension: world.getDimension("overworld")
            });
            promise.catch(reason => {
                world.sendMessage("Minecraft Track System load data failed(cannot create ticking-area)!: " + reason);
            });
            promise.then(() => {
                commonTickingAreaForEntities = world.tickingAreaManager.getTickingArea("mts_public_ticking_area")!;
                system.runTimeout(() => {
                    if (typeof commonTickingAreaForEntities == "undefined") {
                        world.sendMessage("Minecraft Track System load data failed(cannot create ticking-area)!");
                    } else {
                        MTS.railwayData.load();
                    }
                }, 50);
            });
        });

        world.beforeEvents.playerLeave.subscribe(event => {
            if (world.getAllPlayers().length <= 1) {
                railwayData.fullSave();
            }
        });
        system.runInterval(() => {
            world.sendMessage("auto saving Minecraft Track System game data...");// debug
            railwayData.autoSave();
        }, 20 * 60 * 1.5);
    })()
}
