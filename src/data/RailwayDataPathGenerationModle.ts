import { RailwayDataModuleBase } from "./RailwayDataModuleBase";

export class RailwayDataPathGenerationModle extends RailwayDataModuleBase {
    
    public generatePath(depotId: number, callback: (successfulSegments: number) => void): void {
        const depot = this.railwayData.dataCache.depotIdMap.get(depotId);
        if (depot) {
            console.log("Starting path generation for " + depot.name);
            depot.generateMainRoute(this.railwayData.dataCache, this.rails, this.railwayData.sidings, callback)
        } else {
            // This is generally not the case.
            console.log("Failed to generate path, depot is null");
        }
    }
}