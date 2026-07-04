import { ItemComponentUseOnEvent } from "@minecraft/server";

export abstract class ItemBase {

    public abstract useOn(event: ItemComponentUseOnEvent): void;
}