import { Block, Entity } from "@minecraft/server";
import { BlockBase } from "./BlockBase";

export abstract class EntityInsideTriggeredBlock extends BlockBase {

    readonly isEntityInsideTriggeredBlock = true;

    public abstract entityInside(entity: Entity, block: Block): void
}