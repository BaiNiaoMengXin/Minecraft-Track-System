import { Player, system, world } from "@minecraft/server";
import { BetterMap } from "data/BetterMap";

export interface PlayerEvent {
    itemType: string;
}

export class PlayerEvents {

    private static readonly events: BetterMap<Player, PlayerEvent> = new BetterMap<Player, PlayerEvent>();

    public static get(player: Player): PlayerEvent {
        if (!this.events.has(player)) {
            this.events.set(player, { itemType: "" });
        }
    
        return JSON.parse(JSON.stringify(this.events.get(player)!)) as PlayerEvent;
    }

    public static set<K extends keyof PlayerEvent>(player: Player, key: K, value: PlayerEvent[K]) {
        this.get(player).itemType = value;
    }
}

world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    const itemType = itemStack.typeId;

    PlayerEvents.set(player, "itemType", itemType);
    system.runInterval(()=>{
        PlayerEvents.set(player, "itemType", "")
    }, 6)
})
