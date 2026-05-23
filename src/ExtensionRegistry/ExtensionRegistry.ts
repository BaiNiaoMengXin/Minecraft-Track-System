import { system, world } from "@minecraft/server";

export class ExtensionRegistry {
    protected mRegistry: Registry | undefined = undefined;

    constructor() {
        // world.afterEvents.worldLoad.subscribe(() => {
            system.runTimeout(() => 
            {
                if (world.scoreboard.getObjective("mtsExtensionRegistry"))
                {
                    this.mRegistry = JSON.parse(world.scoreboard.getObjective("mtsExtensionRegistry")!.displayName)
                    world.sendMessage("§a所有追加包已加载完毕!");
                }
            }, 20 * 2)
        // })
    }

    getAllRailExtension(): ExtensionRail[] | undefined {
        return this.mRegistry !== undefined ? this.mRegistry.rails : undefined;
    }
}

export interface ExtensionTrain {
    readonly name: string,
    readonly cars: ({
        readonly entity_name: string
    }) [],
    readonly car_length: number,
    readonly bogie_entity_name: string,
    readonly bogie_front_offset: number,
    readonly bogie_after_offset: number,
}

export interface ExtensionRail {
    readonly name: string,
    readonly entity_name: string,
    readonly single_segment_model_length: number,
}

export interface Registry {
    readonly trains: ExtensionTrain[],
    readonly rails: ExtensionRail[]
}