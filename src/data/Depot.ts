import { NameColorDataBase } from "./NameColorDataBase";
import { Rail } from "./Rail";
import { TransportMode } from "./TransportMode";
import { currentTimeMillis } from "./Base";
import { AreaBase } from "./AreaBase";
import { system, world } from "@minecraft/server";
import { RailwayData } from "./RailwayData";
import { Siding } from "./Siding";
import { Train } from "./Train";
import { IReducedSaveData } from "./IReducedSaveData";
import { Integer } from "jLib/Math";
import { ArrayList } from "jLib/ArrayList";
import { DataCache } from "./DataCache";
import { BlockPos } from "util/math/BlockPos";
import { SavedRailBase } from "./SavedRailBase";
import { PathData } from "path/PathData";
import { PathFinder } from "path/PathFinder";
import { BetterMap } from "./BetterMap";
import { MessagePackHelper } from "./MessagePackHelper";


export class Depot extends AreaBase implements IReducedSaveData {

	public static readonly HOURS_IN_DAY : number = 24;
	public static readonly TRAIN_FREQUENCY_MULTIPLIER : number = 4;
	public static readonly TICKS_PER_HOUR : number = 1000;
	public static readonly MILLIS_PER_TICK : number = 50;
	public static readonly MILLISECONDS_PER_DAY : number = this.HOURS_IN_DAY * 60 * 60 * 1000;
	public static readonly DEFAULT_CRUISING_ALTITUDE = 256;
	private static readonly TICKS_PER_DAY : number = this.HOURS_IN_DAY * this.TICKS_PER_HOUR;
	private static readonly CONTINUOUS_MOVEMENT_FREQUENCY : number = 8000;
	private static readonly THRESHOLD_ABOVE_MAX_BUILD_HEIGHT : number = 64;


	public lastDeployedMillis: number = 0;
	private deployIndex: number = 0;
	private departureOffset: number = 0;
	private isDirty: boolean = true;

	public readonly routeIds : ArrayList<number> = new ArrayList();
	public readonly platformTimes: Map<number, Map<number, number>> = new Map()
	public readonly departures: number[] = [];
	public readonly tempDepartures: number[] = [];

	private readonly frequencies: number[] = new Array<number>(Depot.HOURS_IN_DAY).fill(0);
	private readonly deployableSidings: Map<number, Train> = new Map();
    
	public constructor(transportMode: TransportMode);

	public constructor(id: number, transportMode: TransportMode);

	public constructor(map: Record<string, unknown>)
	
    public constructor(arg1: TransportMode | number | Record<string, unknown>, transportMode?: TransportMode) {
        if (arg1 instanceof TransportMode) {
			super(arg1);
		} else if (transportMode) {
			super(arg1 as number, transportMode);
		} else {
			super(arg1 as Record<string, unknown>);
			const messagePackHelper = new MessagePackHelper(arg1 as ReturnType<this['toMessagePack']>);
			messagePackHelper.iterateArrayValue("route_ids", routeId => this.routeIds.push(routeId.asDouble()));

			messagePackHelper.iterateArrayValue("frequencies", (frequency, i) => this.frequencies[i] = frequency.asInt());
			
			messagePackHelper.iterateArrayValue("departures", departure => this.departures.push(departure.asInt()));
			
			this.deployIndex = messagePackHelper.getInt("deploy_index");
			this.lastDeployedMillis = currentTimeMillis() - messagePackHelper.getDouble("last_deployed");
		}
    }

    public override toMessagePack() {
		return {
			...this.toReducedMessagePack(),

			deploy_index: this.deployIndex,
			last_deployed: currentTimeMillis() - this.lastDeployedMillis
		} as const;
    }

	public toReducedMessagePack() {
		return {
			...super.toMessagePack(),

			route_ids: this.routeIds.toArray(),
			
			frequencies: this.frequencies,

			departures: this.departures
		} as const;
	}

    protected override hasTransportMode(): boolean {
		return true;
	}

	public generateMainRoute(dataCache: DataCache, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, sidings: Set<Siding>): void {
		const platformsInRoute = new ArrayList<SavedRailBase>();

		this.routeIds.forEach(routeId => {
			const route = dataCache.routeIdMap.get(routeId);
			if (route) {
				route.platformIds.forEach(platformId => {
					const platform = dataCache.platformIdMap.get(platformId.platformId);
					if (platform && (platformsInRoute.isEmpty() || platform.id != platformsInRoute[platformsInRoute.length - 1].id)) {
						platformsInRoute.push(platform);
					}
				});
			}
		});

		(async() => {
			try {
				const tempPath = new Array<PathData>();
				const successfulSegmentsMain = PathFinder.findPath(tempPath, rails, platformsInRoute, 1, 0, false);
				let successfulSegments = Number.MAX_SAFE_INTEGER;

				sidings.forEach(siding => {
					const sidingMidPos = siding.getMidPos();
					if (siding.isTransportMode(this.transportMode) && this.inArea(sidingMidPos.getX(), sidingMidPos.getZ())) {
						const firstPlatform = platformsInRoute.isEmpty() ? null : platformsInRoute[0];
						const lastPlatform = platformsInRoute.isEmpty() ? null : platformsInRoute[platformsInRoute.length - 1];
						const result = siding.generateRoute(tempPath, successfulSegmentsMain, rails, firstPlatform, lastPlatform, false, 0, false);
						if (result < successfulSegments) {
							successfulSegments = result;
						}
					}
				});
				console.log("Finished path generation" + (this.name == "" ? "" : " for " + this.name));
			} catch (e) {
				console.log("Failed to generate path" + (this.name == "" ? "" : " for " + this.name));
				console.error(e);
			}
		})();
	}

    public setFrequency(newFrequency: number, index: number) {
		if (index >= 0 && index < this.frequencies.length) {
			this.frequencies[index] = Math.trunc(newFrequency);
		}
		this.isDirty = true;
	}

    public getFrequency(index: number): number {
		if (index >= 0 && index < this.frequencies.length) {
			return this.frequencies[index];
		} else {
			return 0;
		}
	}

    public generateTempDepartures() {
		this.tempDepartures.length = 0;
		/*if (this.useRealTime && !this.transportMode!.continuousMovement) {
			this.tempDepartures.addAll(departures);
		} else if (world != null) {*/
			let millisOffset: number = 0;
			while (millisOffset < Depot.MILLISECONDS_PER_DAY) {
				let tempFrequency: number = this.getFrequency(Depot.getHour(millisOffset));
				if (tempFrequency == 0 && !this.transportMode!.continuousMovement) {
					millisOffset = Math.trunc((Math.floor(millisOffset / Depot.MILLIS_PER_TICK / Depot.TICKS_PER_HOUR) + 1) * Depot.TICKS_PER_HOUR * Depot.MILLIS_PER_TICK);
				} else {
					this.tempDepartures.push(Math.trunc((this.lastDeployedMillis + millisOffset) % Depot.MILLISECONDS_PER_DAY));
					millisOffset += this.transportMode!.continuousMovement ? Depot.CONTINUOUS_MOVEMENT_FREQUENCY : Depot.TICKS_PER_HOUR * Depot.MILLIS_PER_TICK * Depot.TRAIN_FREQUENCY_MULTIPLIER / tempFrequency;
				}
			}
			this.tempDepartures.sort(Integer.compare);
		// }
		this.isDirty = false;
	}

    public requestDeploy(sidingId: number, train: Train): void {
		this.deployableSidings.set(sidingId, train);
	}

	public getNextDepartureMillis(): number {
		this.departureOffset++;
		const millisUntilDeploy = this.getMillisUntilDeploy(this.departureOffset);
		return millisUntilDeploy >= 0 ? millisUntilDeploy : -1;
	}

    public deployTrain(railwayData: RailwayData) {
		if (this.isDirty) {
			this.generateTempDepartures();
		}

		if (this.deployableSidings.size != 0 && this.getMillisUntilDeploy(1) == 0) {
			console.log("this.deployableSidings.size != 0 && this.getMillisUntilDeploy(1) == 0")
			const sidingsInDepot: Siding[] = [...railwayData.sidings]
                .filter(siding => {
                    const sidingPos = siding.getMidPos();
                    return siding.isTransportMode(this.transportMode) && this.inArea(sidingPos.getX(), sidingPos.getZ());
                })
                .sort()
                .slice();

			const sidingsInDepotSize = sidingsInDepot.length;
			for (let i = this.deployIndex; i < this.deployIndex + sidingsInDepotSize; i++) {
				const train = this.deployableSidings.get(sidingsInDepot[i % sidingsInDepotSize].id);
				console.log(`[Depot.depolyTrain] deployableSidings: ${JSON.stringify(this.deployableSidings.keys())}`)
				console.log(`[Depot.depolyTrain] sidingsInDepot: ${JSON.stringify(Array.from(sidingsInDepot, siding => siding.id))}`)
				if (train) {
					console.log("[Depot.depolyTrain] Have train")
					this.lastDeployedMillis = currentTimeMillis();
					this.deployIndex++;
					if (this.deployIndex >= sidingsInDepotSize) {
						this.deployIndex = 0;
					}
					train.deployTrain();
					break;
				}
			}
		}

		this.departureOffset = 0;
		this.deployableSidings.clear();
	}

    public getMillisUntilDeploy(offset: number, currentTimeOffset: number = 0): number {
		offset = ~~offset;
		currentTimeOffset = ~~currentTimeOffset;
		const millis = (currentTimeMillis() + currentTimeOffset) % Depot.MILLISECONDS_PER_DAY;
		for (let i = 0; i < this.tempDepartures.length; i++) {
			const thisDeparture = this.tempDepartures[i];
			const nextDeparture = Depot.wrapTime(this.tempDepartures[(i + 1) % this.tempDepartures.length], thisDeparture);
			const newMillis = Depot.wrapTime(millis, thisDeparture);
			if (newMillis > thisDeparture && newMillis <= nextDeparture) {
				if (offset > 1) {
					if (offset <= this.tempDepartures.length) {
						return ~~(Depot.wrapTime(this.tempDepartures[(i + offset) % this.tempDepartures.length], millis) - millis);
					}
				} else {
					return Depot.wrapTime(this.lastDeployedMillis + currentTimeOffset, newMillis) - Depot.MILLISECONDS_PER_DAY >= thisDeparture ? Math.trunc(nextDeparture - newMillis) : 0;
				}
			}
		}
		return -1;
	}

    /**
     * @param offsetMillis int
     * @returns int
     */
    private static getHour(offsetMillis: number): number {
        offsetMillis = ~~(offsetMillis)
		return ~~(Depot.wrapTime(world.getAbsoluteTime() + offsetMillis / Depot.MILLIS_PER_TICK) / Depot.TICKS_PER_HOUR);
	}

    /**
     * @param time float
     * @returns float
     */
	private static wrapTime(time: number): number;

    /**
     * @param time long
     * @param mustBeGreaterThan long
     * @returns long
     */
	private static wrapTime(time: number, mustBeGreaterThan: number): number;

	private static wrapTime(time: number, mustBeGreaterThan?: number): number {
		if (mustBeGreaterThan == undefined) {
			return (time + 6000 + Depot.TICKS_PER_DAY) % Depot.TICKS_PER_DAY;
		} else {
			time = Math.trunc(time)
			mustBeGreaterThan = Math.trunc(mustBeGreaterThan)
			let newTime = time % Depot.MILLISECONDS_PER_DAY;
			while (newTime <= mustBeGreaterThan) {
				newTime += Depot.MILLISECONDS_PER_DAY;
			}
			return newTime;
		}
	}
}
