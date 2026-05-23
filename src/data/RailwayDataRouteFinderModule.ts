import { Platform } from "./Platform"

export namespace RailwayDataRouteFinderModule {
    export class ConnectionDetails {

        private shortestDuration: number = Number.MAX_SAFE_INTEGER
        private readonly platformStart: Platform;
        private readonly durationInfo: Map<number, number> = new Map()

        public constructor(platformStart: Platform) {
            this.platformStart = platformStart;
        }

        public addDurationInfo(routeId: number, duration: number) {
            this.durationInfo.set(routeId, duration);
            this.shortestDuration = Math.min(duration, this.shortestDuration);
        }
    }
}