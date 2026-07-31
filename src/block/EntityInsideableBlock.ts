import { Block, Entity } from "@minecraft/server";
import { BlockBase } from "./BlockBase";

export abstract class EntityInsideableBlock extends BlockBase {

    readonly isEntityInsideableBlock = true;

    public abstract entityInside(entity: Entity, block: Block): void
}