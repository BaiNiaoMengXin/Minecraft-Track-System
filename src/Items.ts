import { RailType } from "data/RailType";
import { ItemRailModifier } from "item/ItemRailModifier";

export namespace Items {

    export const RAIL_CONNECTOR_20 = new ItemRailModifier(true, false, true, false, RailType.WOODEN);
    export const RAIL_CONNECTOR_20_ONE_WAY = new ItemRailModifier(true, false, true, true, RailType.WOODEN);
    export const RAIL_CONNECTOR_40 = new ItemRailModifier(true, false, true, false, RailType.STONE);
    export const RAIL_CONNECTOR_40_ONE_WAY = new ItemRailModifier(true, false, true, true, RailType.STONE);
    export const RAIL_CONNECTOR_60 = new ItemRailModifier(true, false, true, false, RailType.EMERALD);
    export const RAIL_CONNECTOR_60_ONE_WAY = new ItemRailModifier(true, false, true, true, RailType.EMERALD);
    export const RAIL_CONNECTOR_80 = new ItemRailModifier(true, false, true, false, RailType.IRON);
    export const RAIL_CONNECTOR_80_ONE_WAY = new ItemRailModifier(true, false, true, true, RailType.IRON);
    export const RAIL_CONNECTOR_120 = new ItemRailModifier(true, false, true, false, RailType.OBSIDIAN);
    export const RAIL_CONNECTOR_120_ONE_WAY = new ItemRailModifier(true, false, true, true, RailType.OBSIDIAN);
    export const RAIL_CONNECTOR_PLATFORM = new ItemRailModifier(true, true, true, false, RailType.PLATFORM);
    export const RAIL_CONNECTOR_SIDING = new ItemRailModifier(true, true, true, false, RailType.SIDING);
    export const RAIL_CONNECTOR_TURN_BACK = new ItemRailModifier(true, false, true, false, RailType.TURN_BACK);
}