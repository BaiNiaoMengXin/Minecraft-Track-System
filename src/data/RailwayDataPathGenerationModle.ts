import { RailwayDataModuleBase } from "./RailwayDataModuleBase";

export class RailwayDataPathGenerationModle extends RailwayDataModuleBase {
    
    public generatePath(depotId: number): void {
        const depot = this.railwayData.dataCache.depotIdMap.get(depotId);
        if (depot) {
            console.log("Starting path generation for " + depot.name);
            depot.generateMainRoute(this.railwayData.dataCache, this.rails, this.railwayData.sidings)
        } else {
            // This is generally not the case.
            console.log("Failed to generate path, depot is null");
        }
    }
}