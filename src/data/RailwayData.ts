import { Rail } from "./Rail";
import { Station } from "./Station"
import { Platform } from "./Platform"
import { generateUniqueNumberID } from "./Base";
import { BetterMap } from "./BetterMap";
import { Depot } from "./Depot";
import { Route } from "./Route";
import { TransportMode } from "./TransportMode";
import { Player, Vector3, world } from "@minecraft/server";
import { DataCache } from "./DataCache";
import { RailType } from "./RailType";
import { SavedRailBase } from "./SavedRailBase";
import { Siding } from "./Siding";
import { BlockPos } from "util/math/BlockPos";
import { SerializedDataBase } from "./SerializedDataBase";
import { SignalBlocks } from "./SignalBlocks";
import { RailwayDataFileSaveModule } from "./RailwayDataFileSaveModule";
import { ScheduleEntry } from "./ScheduleEntry";
import { UUID } from "jLib/UUID";
import { DyeColor } from "util/DyeColor";
import { PathData } from "path/PathData";
import { BlockNode } from "block/BlockNode";
import { RailwayDataPathGenerationModle } from "./RailwayDataPathGenerationModle";
import { RailwayDataRailActionsModule } from "./RailwayDataRailActionsModule";
import { RailwayDataCoolDownModule } from "./RailwayDataCoolDownModule";
import { RailwayDataDriveTrainModule } from "./RailwayDataDriveTrainModule";
import { Lift } from "./Lift";
import { DisposableSet } from "util/DisposableSet";

export class RailwayData {

	public readonly stations: Set<Station> = new Set();
	public readonly platforms: Set<Platform> = new Set();
	public readonly sidings: DisposableSet<Siding> = new DisposableSet();
	public readonly routes: Set<Route> = new Set();
	public readonly depots: Set<Depot> = new Set();
	public readonly lifts: DisposableSet<Lift> = new DisposableSet();
	public readonly dataCache: DataCache = new DataCache(this.stations, this.platforms, this.sidings, this.routes, this.depots, this.lifts);

	public readonly railwayDataCoolDownModule: RailwayDataCoolDownModule;
	public readonly railwayDataPathGenerationMoudle: RailwayDataPathGenerationModle;
	public readonly railwayDataDriveTrainModule: RailwayDataDriveTrainModule;
	public readonly railwayDataRailActionsModule: RailwayDataRailActionsModule;

	private prevPlatformCount: number = 0;
	private prevSidingCount: number = 0;
	private useTimeSync: boolean = false;

	private readonly rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>> = new BetterMap();
	public readonly signalBlocks: SignalBlocks = new SignalBlocks()

	private readonly railwayDataFileSaveModule: RailwayDataFileSaveModule;

	private readonly trainPositions: Array<BetterMap<UUID, number>> = new Array(2);
	private readonly schedulesForPlatform: Map<number, Array<ScheduleEntry>> = new Map();

	private static readonly DATA_VERSION = 1;

	private static readonly KEY_DATA_VERSION = "mts_data_version";
	private static readonly KEY_USE_TIME_SYNC = "use_time_sync"

	public constructor() {
		this.trainPositions[0] = new BetterMap();
		this.trainPositions[1] = new BetterMap();

		this.railwayDataFileSaveModule = new RailwayDataFileSaveModule(this, this.rails, this.signalBlocks);
		this.railwayDataPathGenerationMoudle = new RailwayDataPathGenerationModle(this, this.rails);
		this.railwayDataDriveTrainModule = new RailwayDataDriveTrainModule(this, this.rails);
		this.railwayDataRailActionsModule = new RailwayDataRailActionsModule(this, this.rails);
		this.railwayDataCoolDownModule = new RailwayDataCoolDownModule(this, this.rails);
	}
	public load() {
		
		this.railwayDataFileSaveModule.load();
		this.validateData();
		this.dataCache.sync();
		this.signalBlocks.writeCache();

		try {
			this.useTimeSync = world.getDynamicProperty(RailwayData.KEY_USE_TIME_SYNC) as boolean | undefined ?? false;
		} catch (e) {
			console.log(e)
		}
		this.runRealTimeSync();
	}

	public fullSave() {
		this.railwayDataFileSaveModule.fullSave();
		this.saveMisc();
	}

	public autoSave() {
		this.railwayDataFileSaveModule.autoSave();
		this.saveMisc();
	}

	private saveMisc() {
		try {
			world.setDynamicProperty(RailwayData.KEY_DATA_VERSION, RailwayData.DATA_VERSION);
			world.setDynamicProperty(RailwayData.KEY_USE_TIME_SYNC, this.useTimeSync);
		} catch (e) {
			console.error("[ERROR] saveMisc failed: " + e);
		}
	}

	public simulateTrains(): void {
		this.trainPositions.splice(0, 1);
		this.trainPositions.push(new BetterMap());
		this.schedulesForPlatform.clear();
		this.signalBlocks.resetOccupied();
		this.sidings.forEach(siding => {
			siding.setSidingData(this.dataCache.sidingIdToDepot.get(siding.id) ?? null, this.rails);
			siding.simulateTrain(this.dataCache, this.trainPositions, this.signalBlocks, this.schedulesForPlatform);
		});
		this.depots.forEach(depot => depot.deployTrain(this));

		this.lifts.forEach(lift => lift.tick());

		this.railwayDataCoolDownModule.tick();
		this.railwayDataDriveTrainModule.tick();
		this.railwayDataRailActionsModule.tick();

		if (this.prevPlatformCount != this.platforms.size || this.prevSidingCount != this.sidings.size) {
			this.dataCache.sync();
		}
		this.prevPlatformCount = this.platforms.size;
		this.prevSidingCount = this.sidings.size;

		this.railwayDataFileSaveModule.autoSaveTick();
		this.runRealTimeSync();
	}

	// writing data

	public addRail(player: Player, transportMode: TransportMode, posStart: BlockPos, posEnd: BlockPos, rail: Rail, validate: boolean): number {
		const newId = validate ? generateUniqueNumberID() : 0;
		RailwayData.addRail(this.rails, this.platforms, this.sidings, transportMode, posStart, posEnd, rail, newId);

		if (validate) {
			this.validateData();
		}

		return newId;
	}

	public addSignal(player: Player, color: DyeColor, posStart: BlockPos, posEnd: BlockPos): number {
		world.sendMessage(`${player.name}, SignalBlock, , "color:${color}", ${posStart.asJson()}, ${posEnd.asJson()}`);
		return this.signalBlocks.add(0, color, PathData.getRailProduct(posStart, posEnd));
	}

	public removeNode(player: Player, pos: BlockPos, transportMode: TransportMode): void {
		RailwayData.removeNode(this.rails, pos);
		this.validateData();
	}

	public removeRailConnection(player: Player, pos1: BlockPos, pos2: BlockPos): void {
		RailwayData.removeRailConnection(this.rails, pos1, pos2);
		this.validateData();
	}

	public removeLiftFloorTrack(pos: BlockPos): void {
		RailwayData.removeLiftFloorTrack(this.lifts, pos);
		this.dataCache.sync();
	}

	public hasSavedRail(pos: BlockPos): boolean {
		return this.rails.has(pos) && Array.from(this.rails.get(pos)!.values()).some(rail => rail.railType.hasSavedRail);
	}

	public containsRail(pos1: BlockPos, pos2: BlockPos): boolean {
		return RailwayData.containsRail(this.rails, pos1, pos2);
	}

	public removeSignal(player: Player, color: DyeColor, posStart: BlockPos, posEnd: BlockPos): number {
		return this.signalBlocks.remove(0, color, PathData.getRailProduct(posStart, posEnd));
	}

	public getSchedulesForStation(schedulesForStation: Map<number, Array<ScheduleEntry>>, stationId: number): void {
		this.schedulesForPlatform.forEach((schedules, platformId) => {
			const station = this.dataCache.platformIdToStation.get(platformId);
			if (station != null && station.id == stationId) {
				schedulesForStation.set(platformId, schedules);
			}
		});
	}

	public getSchedulesAtPlatform(platformId: number): Array<ScheduleEntry> | null {
		return this.schedulesForPlatform.get(platformId) ?? null;
	}

	public getUseTimeSync(): boolean {
		return this.useTimeSync;
	}

	public setUseTimeSync(useTimeAndWindSync: boolean): void {
		this.useTimeSync = useTimeAndWindSync;
		this.runRealTimeSync();
	}

	private validateData(): void {
		RailwayData.removeSavedRail(this.platforms, this.rails);
		RailwayData.removeSavedRail(this.sidings, this.rails);

		const railsToRemove = new Array<BlockPos>();
		this.rails.forEach((railMap, startPos) => railMap.forEach((rail, endPos) => {
			if (rail.railType.hasSavedRail && SavedRailBase.isInvalidSavedRail(this.rails, endPos, startPos)) {
				railsToRemove.push(startPos);
				railsToRemove.push(endPos);
			}
		}));
		for (let i = 0; i < railsToRemove.length - 1; i += 2) {
			RailwayData.removeRailConnection(this.rails, railsToRemove[i], railsToRemove[i + 1]);
		}
	}

	private runRealTimeSync(): void {
		if (this.useTimeSync) {
			const date = new Date();
			const ticks = Math.round((date.getHours() + Depot.HOURS_IN_DAY - 6) * 1000 + date.getMinutes() / 0.06 + date.getSeconds() / 3.6) % 24000;
			try {
				world.setTimeOfDay(ticks);
			} catch (e) {
			}
		}
	}

	public getRails(): ReadonlyMap<BlockPos, ReadonlyMap<BlockPos, Rail>> {
		return this.rails;
	}

	// static finders

	public static getPlatformByPos(platforms: Set<Platform>, pos: BlockPos): Platform | null {
		return Array.from(platforms).find(platform => platform.containsPos(pos)) ?? null;
	}

	// other

	public static addRail(rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, platforms: Set<Platform>, sidings: Set<Siding>, transportMode: TransportMode, posStart: BlockPos, posEnd: BlockPos, rail: Rail, savedRailId: number): void {
		rails.get(posStart)?.get(posEnd)?.destroyEntities();
		rails.get(posEnd)?.get(posStart)?.destroyEntities();

		if (!rails.has(posStart)) {
			rails.set(posStart, new BetterMap());
		}
		rails.get(posStart)!.set(posEnd, rail);

		if (savedRailId != 0) {
			if (rail.railType == RailType.PLATFORM && Array.from(platforms).every(platform => !platform.containsPos(posStart) || platform.containsPos(posEnd))) {
				platforms.add(new Platform(savedRailId, transportMode, posStart, posEnd));
			} else if (rail.railType == RailType.SIDING && Array.from(sidings).every(siding => !siding.containsPos(posStart) || siding.containsPos(posEnd))) {
				sidings.add(new Siding(savedRailId, transportMode, posStart, posEnd, Math.floor(rail.getLength())));
			}
		}
	}

	public static removeNode(rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, pos: BlockPos): void {
		try {
			rails.get(pos)?.forEach((rail, posEnd) => {
				rail.destroyEntities();
			})
			rails.delete(pos);
			rails.forEach((railMap, startPos) => {
				railMap.get(pos)?.destroyEntities();
				railMap.delete(pos);
				if (railMap.isEmpty()) {
					BlockNode.resetRailNode(startPos);
				}
			});
			RailwayData.validateRails(rails);
		} catch (e) {
			console.error(e);
		}
	}

	public static removeLiftFloorTrack(lifts: DisposableSet<Lift>, pos: BlockPos): void {
		for (const lift of lifts) {
			if (lift.hasFloor(pos)) {
				lifts.delete(lift);
			}
		}
		this.validateLifts(lifts);
	}

	public static removeRailConnection(rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, pos1: BlockPos, pos2: BlockPos): void {
		try {
			if (rails.has(pos1)) {
				rails.get(pos1)!.get(pos2)?.destroyEntities();
				rails.get(pos1)!.delete(pos2);
				if (rails.get(pos1)!.isEmpty()) {
					BlockNode.resetRailNode(pos1);
				}
			}
			if (rails.has(pos2)) {
				rails.get(pos2)!.get(pos1)?.destroyEntities();
				rails.get(pos2)!.delete(pos1);
				if (rails.get(pos2)!.isEmpty()) {
					BlockNode.resetRailNode(pos2);
				}
			}
			RailwayData.validateRails(rails);
		} catch (e) {
		}
	}

	public static containsRail(rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, pos1: BlockPos, pos2: BlockPos): boolean {
		return rails.has(pos1) && rails.get(pos1)!.has(pos2);
	}

	public static getStation(stations: Set<Station>, pos: BlockPos): Station | null {
		for (const station of stations) {
			if (station.inArea(pos.getX(), pos.getZ())) {
				return station;
			}
		}
		return null;
	}

	public static getClosePlatformId(platforms: Set<Platform>, dataCache: DataCache, pos: BlockPos): number;
	public static getClosePlatformId(platforms: Set<Platform>, dataCache: DataCache, pos: BlockPos, radius: number, lower: number, upper: number): number;

	public static getClosePlatformId(platforms: Set<Platform>, dataCache: DataCache, pos: BlockPos, radius?: number, lower?: number, upper?: number): number {
		if (radius == undefined || lower == undefined || upper == undefined) {
			return RailwayData.getClosePlatformId(platforms, dataCache, pos, 5, 0, 4);
		}

		const posLong = pos.asLong();
		if (dataCache.blockPosToPlatformId.has(posLong)) {
			return dataCache.blockPosToPlatformId.get(posLong)!;
		} else {
			let platformId = 0;
			for (let i = 1; i <= radius; i++) {
				const searchRadius = i;
				platformId = Array.from(platforms).filter(platform => platform.isCloseToSavedRail(pos, searchRadius, lower, upper)).sort((a, b) => a.getMidPos().distManhattan(pos) - b.getMidPos().distManhattan(pos))[0]?.id || 0;
				if (platformId != 0) {
					break;
				}
			}
			dataCache.blockPosToPlatformId.set(posLong, platformId);
			return platformId;
		}
	}

	public static useRoutesAndStationsFromIndex(stopIndex: number, routeIds: number[], dataCache: DataCache, routeAndStationsCallback: (currentStationIndex: number, thisRoute: Route, nextRoute: Route | null, thisStaion: Station | null, nextStaion: Station | null, lastStation: Station | null) => void): boolean {
		if (stopIndex < 0) {
			return false;
		}

		let sum = 0;
		for (let i = 0; i < routeIds.length; i++) {
			const thisRoute = dataCache.routeIdMap.get(routeIds[i]);
			const nextRoute = i < routeIds.length - 1 && !dataCache.routeIdMap.get(routeIds[i + 1])!.isHidden ? dataCache.routeIdMap.get(routeIds[i + 1]) : undefined;
			if (thisRoute != undefined) {
				const difference = stopIndex - sum;
				sum += thisRoute.platformIds.length;
				if (thisRoute.platformIds.length != 0 && nextRoute != null && nextRoute.platformIds.length != 0 && thisRoute.getLastPlatformId() == nextRoute.getFirstPlatformId()) {
					sum--;
				}
				if (stopIndex < sum) {
					const thisStation = dataCache.platformIdToStation.get(thisRoute.platformIds[difference].platformId);
					const nextStation = difference < thisRoute.platformIds.length - 1 ? dataCache.platformIdToStation.get(thisRoute.platformIds[difference + 1].platformId) : undefined;
					const lastStation = thisRoute.platformIds.length == 0 ? undefined : dataCache.platformIdToStation.get(thisRoute.getLastPlatformId());
					routeAndStationsCallback(difference, thisRoute, nextRoute ?? null, thisStation ?? null, nextStation ?? null, lastStation ?? null);
					return true;
				}
			}
		}
		return false;
	}



	public static newBlockPos(x: number, y: number, z: number): BlockPos;
	public static newBlockPos(vec3: Vector3): BlockPos;

	public static newBlockPos(arg1: number | Vector3, y?: number, z?: number): BlockPos {
		if (typeof arg1 === 'number') {
			return new BlockPos(Math.floor(arg1), Math.floor(y!), Math.floor(z!));
		}
		return new BlockPos(Math.floor(arg1.x), Math.floor(arg1.y), Math.floor(arg1.y));
	}

	public static offsetBlockPos(pos: BlockPos, x: number, y: number, z: number): BlockPos {
		return x == 0 && y == 0 && z == 0 ? pos : this.newBlockPos(pos.getX() + x, pos.getY() + y, pos.getZ() + z);
	}

	public static round(value: number, decimalPlaces: number): number {
		let factor = 1;
		for (let i = 0; i < decimalPlaces; i++) {
			factor *= 10;
		}
		return Math.round(value * factor) / factor;
	}

	public static chunkLoaded(pos: BlockPos): boolean;
	public static chunkLoaded(pos: Vector3): boolean;

	public static chunkLoaded(pos: BlockPos | Vector3): boolean {
		return world.getDimension("overworld").isChunkLoaded(pos instanceof BlockPos ? pos.asJson() : pos);
	}

	public static isBetween(value: number, value1: number, value2: number, padding: number = 0): boolean {
		return value >= Math.min(value1, value2) - padding && value <= Math.max(value1, value2) + padding;
	}

	private static validateRails(rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>): void {
		const railsToRemove = new Array<BlockPos>();
		const railsNodesToRemove = new Array<BlockPos>();
		rails.forEach((railMap, startPos) => {
			const chunkLoaded = RailwayData.chunkLoaded(startPos);
			if (chunkLoaded && !(world.getDimension("overworld").getBlock(startPos.asJson())!.typeId == BlockNode.RAIL_NODE_BLOCK_KEY_NAME)) {
				railsNodesToRemove.push(startPos);
			}

			if (railMap.isEmpty()) {
				railsToRemove.push(startPos);
			}
		});
		railsToRemove.forEach(v => {
			rails.get(v)?.forEach((rail, posEnd) => rail.destroyEntities())
			rails.delete(v)
		});
		railsNodesToRemove.forEach(pos => RailwayData.removeNode(rails, pos));
	}

	public static validateLifts(lifts: DisposableSet<Lift>): void {
		for (const lift of lifts) {
			if (lift.isInvalidLift()) {
				lifts.delete(lift);
			}
		}
	}

	private static removeSavedRail<T extends SavedRailBase>(savedRailBases: Set<T>, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>): void {
		for (const savedRailBase of savedRailBases) {
			if (savedRailBase.isInvalidSavedRail(rails)) {
				savedRailBases.delete(savedRailBase);
			}
		};
	}
}

// TODO temporary code start

/** @deprecated */
export class RailEntry extends SerializedDataBase {

	public readonly pos: BlockPos;
	public readonly connections: BetterMap<BlockPos, Rail>;

	public constructor(pos: BlockPos, connections: BetterMap<BlockPos, Rail>);

	public constructor(map: Record<string, unknown>);

	public constructor(arg1: BlockPos | object, arg2?: BetterMap<BlockPos, Rail>) {
		super()
		if (arg2 !== undefined) {
			this.pos = arg1 as BlockPos;
			this.connections = arg2;
		} else {
			const packet = arg1 as ReturnType<this["toMessagePack"]>;
			this.pos = BlockPos.fromLong(BigInt(packet.node_pos));
			this.connections = new BetterMap();
			packet.rail_connections.forEach(value => {
				this.connections.set(BlockPos.fromLong(BigInt(value.node_pos)), new Rail(value))
			})
		}
	}

	public override toMessagePack() {
		return {
			node_pos: this.pos.asLong().toString(),
			rail_connections: Array.from(this.connections, ([pos1, rail]) => {
				return {
					node_pos: pos1.asLong().toString(),
					...rail.toMessagePack()
				} as const;
			})
		} as const;
	}
}

// TODO temporary code end
