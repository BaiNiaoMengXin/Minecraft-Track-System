import { PlayerBreakBlockBeforeEvent, PlayerInteractWithBlockBeforeEvent } from "@minecraft/server";

export abstract class BlockBase {

    public use(event: PlayerInteractWithBlockBeforeEvent): void {
    }

    public playerWillDestroy(event: PlayerBreakBlockBeforeEvent): void {
    }
}