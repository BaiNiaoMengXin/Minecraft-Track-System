import { Entity, EntityComponent, EntityComponentTypes, Player, system, world } from "@minecraft/server";
import { Rail } from "data/Rail";
import { RailwayData } from "data/RailwayData";
import { Items } from "Items";
import { RenderRail } from "render/RenderRail";
import { BlockPos } from "util/math/BlockPos";

export namespace MTS {

    export const railwayData: RailwayData = new RailwayData();

    export const railsToStandardRender: Set<Rail> = new Set();
    const RAIL_RENDER_DURATION = 10;
 
    function posInPlayerRenderRange(pos: BlockPos, player: Player): boolean {
        return pos.distanceTo((player.location as any) as BlockPos) < player.clientSystemInfo.maxRenderDistance * 16;
    }

    function hideAndUseParticleRenderRail(rail: Rail, railsSet: Set<Rail>, player: Player): void {
        if (!railsSet.has(rail)) {
            rail.getEntities().forEach(entity => {
                entity.addEffect("minecraft:invisibility", 20000000, { showParticles: false });
            });
            railsSet.add(rail);
            // TODO fix render duration
            RenderRail.particleRenderRailStandard(rail, 0.0625 + RenderRail.SMALL_OFFSET, 1, 1, player, true, RAIL_RENDER_DURATION + 1);
        }
    }

    function showRail(rail: Rail): void {
        rail.getEntities().forEach(entity => {
            entity.removeEffect("minecraft:invisibility");
        });
    }

    system.runInterval(() => {
        const tempRailsToStandardRender = new Set<Rail>()
        world.getAllPlayers().forEach(player => {
            const inventory = player.getComponent(EntityComponentTypes.Inventory);
            if (inventory) {
                const itemStack = inventory.container.getItem(player.selectedSlotIndex);
                const rails = railwayData.getRails();

                if (itemStack && Items.railConnectors.includes(itemStack.typeId)) {
                    rails.forEach((innerMap, posStart) => {
                        if (posInPlayerRenderRange(posStart, player)) {
                            innerMap.forEach((rail, posEnd) => hideAndUseParticleRenderRail(rail, tempRailsToStandardRender, player));
                        } else {
                            innerMap.forEach((rail, posEnd) => {
                                if (posInPlayerRenderRange(posEnd, player)) {
                                    hideAndUseParticleRenderRail(rail, tempRailsToStandardRender, player);
                                }
                            });
                        }
                    });
                }
            }
        })
        railsToStandardRender.forEach(rail => {
            if (!tempRailsToStandardRender.has(rail)) {
                showRail(rail);
            }
        })
        railsToStandardRender.clear()
        tempRailsToStandardRender.forEach(rail => railsToStandardRender.add(rail))
    }, RAIL_RENDER_DURATION);
}