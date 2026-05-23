import { BlockPos } from "util/math/BlockPos";
import { BetterMap } from "./BetterMap";
import { RailwayData } from "./RailwayData";
import { Rail } from "./Rail";

export abstract class RailwayDataModuleBase {

    protected readonly railwayData: RailwayData;
    protected readonly rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>;

    public constructor(railwayData: RailwayData, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>) {
        this.railwayData = railwayData;
        this.rails = rails
    }
}