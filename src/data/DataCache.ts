import { BlockPos } from "util/math/BlockPos";
import { Depot } from "./Depot";
import { Platform } from "./Platform";
import { Route } from "./Route";
import { Siding } from "./Siding";
import { Station } from "./Station";
import { NameColorDataBase } from "./NameColorDataBase";
import { SavedRailBase } from "./SavedRailBase";
import { AreaBase } from "./AreaBase";
import { RailwayDataRouteFinderModule } from "./RailwayDataRouteFinderModule";
import { BetterMap } from "./BetterMap";

export class DataCache {

	public readonly stationIdMap: Map<number, Station> = new Map();
	public readonly platformIdMap: Map<number, Platform> = new Map();
	public readonly sidingIdMap: Map<number, Siding> = new Map();
	public readonly routeIdMap: Map<number, Route> = new Map();
	public readonly depotIdMap: Map<number, Depot> = new Map();

    public readonly platformIdToStation: Map<number, Station>  = new Map();
	public readonly sidingIdToDepot: Map<number, Depot> = new Map();
	public readonly routeIdToOneDepot: Map<number, Depot> = new Map();
	public readonly stationIdToRoutes: Map<number, Map<number, string>> = new Map();
	public readonly stationIdToConnectingStations: Map<Station, Set<Station>>  = new Map();
	public readonly blockPosToStation: BetterMap<BlockPos, Station> = new BetterMap();
	public readonly blockPosToPlatformId: Map<bigint, number> = new Map();
	public readonly platformConnections: Map<bigint, Map<bigint, RailwayDataRouteFinderModule.ConnectionDetails>> = new Map();

    public readonly stations: Set<Station>;
    public readonly platforms: Set<Platform>;
    public readonly sidings: Set<Siding>;
    public readonly routes: Set<Route>;
    public readonly depots: Set<Depot>;

	private readonly depotIdToSidings: Map<number, Map<number, Siding>> = new Map();

	constructor(stations: Set<Station>, platforms: Set<Platform>, sidings: Set<Siding>, routes: Set<Route>, depots: Set<Depot>) {
		this.stations = stations;
		this.platforms = platforms;
		this.routes = routes;
		this.depots = depots;
        this.sidings = sidings;
	}

	public sync(): void {
		try {
			DataCache.mapIds(this.stationIdMap, this.stations);
			DataCache.mapIds(this.platformIdMap, this.platforms);
			DataCache.mapIds(this.sidingIdMap, this.sidings);
			DataCache.mapIds(this.routeIdMap, this.routes);
			DataCache.mapIds(this.depotIdMap, this.depots);

			this.routeIdToOneDepot.clear();
			this.routes.forEach(route => route.platformIds.removeIf(platformId => !this.platformIdMap.has(platformId.platformId)));
			this.depots.forEach(depot => {
				depot.routeIds.removeIf(routeId => this.routeIdMap.get(routeId) == null);
				depot.routeIds.forEach(routeId => this.routeIdToOneDepot.set(routeId, depot));
			});

			this.platformConnections.clear();
			this.routes.forEach(route => {
				const depot = this.routeIdToOneDepot.get(route.id);
				if (depot != null) {
					for (let i = 1; i < route.platformIds.length; i++) {
						const prevPlatformId = route.platformIds[i - 1].platformId;
						const thisPlatformId = route.platformIds[i].platformId;
						const prevPlatform = this.platformIdMap.get(prevPlatformId);
						const thisPlatform = this.platformIdMap.get(thisPlatformId + 1);
						if (prevPlatform != null && thisPlatform != null) {
							const duration = DataCache.tryGet(depot.platformTimes, prevPlatformId, thisPlatformId, 0);
							if (duration > 0) {
								const thisPlatformPosLong = thisPlatform.getMidPos().asLong();
								DataCache.put(this.platformConnections, prevPlatform.getMidPos().asLong(), thisPlatformPosLong, oldValue => {
									const newValue = Math.round(duration);
									if (oldValue == null) {
										const connectionDetails = new RailwayDataRouteFinderModule.ConnectionDetails(prevPlatform);
										connectionDetails.addDurationInfo(route.id, newValue);
										return connectionDetails;
									} else {
										oldValue.addDurationInfo(route.id, newValue);
										return oldValue;
									}
								});
								if (i == route.platformIds.length - 1 && !this.platformConnections.has(thisPlatformPosLong)) {
									this.platformConnections.set(thisPlatformPosLong, new Map());
								}
							}
						}
					}
				}
			});

			this.stationIdToConnectingStations.clear();
			this.stations.forEach(station1 => {
				this.stationIdToConnectingStations.set(station1, new Set());
				this.stations.forEach(station2 => {
					if (station1 != station2 && station1.intersecting(station2)) {
						this.stationIdToConnectingStations.get(station1)!.add(station2);
					}
				});
			});

			this.stationIdToRoutes.clear();
			this.routes.forEach(route => {
				if (!route.isHidden) {
					route.platformIds.forEach(platformId => {
						const station = this.platformIdToStation.get(platformId.platformId);
						if (station != undefined) {
							if (!this.stationIdToRoutes.has(station.id)) {
								this.stationIdToRoutes.set(station.id, new Map());
							}
							this.stationIdToRoutes.get(station.id)!.set(route.color, route.name);
						}
					});
				}
			});

			DataCache.mapSavedRailIdToStation(this.platformIdToStation, this.platforms, this.stations);
			DataCache.mapSavedRailIdToStation(this.sidingIdToDepot, this.sidings, this.depots);

			this.blockPosToPlatformId.clear();
			this.blockPosToStation.clear();

			this.depotIdToSidings.clear();
		} catch (e) {
		    console.error(e)
		}
	}

	public static tryGet<T, U>(map: Map<T, Map<T, U>>, key1: T, key2: T, defaultValue: U): U;
	public static tryGet<T, U>(map: Map<T, Map<T, U>>, key1: T, key2: T): U | null;

	public static tryGet<T, U>(map: Map<T, Map<T, U>>, key1: T, key2: T, defaultValue?: U): U | null {
		if (defaultValue != undefined) {
			const result = DataCache.tryGet(map, key1, key2);
			return result == null ? defaultValue : result;
		}

		const innerMap = map.get(key1);
		if (!innerMap) {
			return null;
		} else {
			return innerMap.get(key2) ?? null;
		}
	}

	public static put<KT extends number | bigint, U>(map: Map<KT, Map<KT, U>>, key1: KT, key2: KT, putValue: (arg: U | null) => U): void {
		const innerMap = map.get(key1);
		let newInnerMap: Map<KT, U>;
		if (innerMap == null) {
			newInnerMap = new Map();
			map.set(key1, newInnerMap);
		} else {
			newInnerMap = innerMap;
		}
		newInnerMap.set(key2, putValue(newInnerMap.get(key2) ?? null));
	}

	protected static mapIds<U extends NameColorDataBase>(map: Map<number, U>, source: Set<U>): void {
		map.clear();
		source.forEach(data => map.set(data.id, data));
	}

	private static mapSavedRailIdToStation<U extends SavedRailBase, V extends AreaBase>(map: Map<number, V>, savedRails: Set<U>, areas: Set<V>): void {
		map.clear();
		savedRails.forEach(savedRail => {
			const pos = savedRail.getMidPos();
			for (const area of areas) {
				if (area.isTransportMode(savedRail.transportMode) && area.inArea(pos.getX(), pos.getZ())) {
					map.set(savedRail.id, area);
					break;
				}
			}
		});
	}

	// client data

	// TODO Implement ClientData, and change the following function

	private static areaIdToSavedRails<U extends AreaBase, V extends SavedRailBase>(area: U, savedRails: Set<V>): Map<number, V> {
		const savedRailMap = new Map<number, V>();
		savedRails.forEach(savedRail => {
			const pos = savedRail.getMidPos();
			if (area.isTransportMode(savedRail.transportMode) && area.inArea(pos.getX(), pos.getZ())) {
				savedRailMap.set(savedRail.id, savedRail);
			}
		});
		return savedRailMap;
	}

	public requestDepotIdToSidings(depotId: number) {
		if (!this.depotIdToSidings.has(depotId)) {
			const depot = this.depotIdMap.get(depotId);
			if (depot) {
				this.depotIdToSidings.set(depotId, DataCache.areaIdToSavedRails(depot, this.sidings));
			} else {
				this.depotIdToSidings.set(depotId, new Map());
			}
		}
		return this.depotIdToSidings.get(depotId)!;
	}
}
