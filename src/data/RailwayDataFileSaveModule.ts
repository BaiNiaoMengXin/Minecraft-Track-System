import { RailwayDataModuleBase } from "./RailwayDataModuleBase";
import { SignalBlock, SignalBlocks } from "./SignalBlocks";
import { BlockPos } from "util/math/BlockPos";
import { RailEntry, RailwayData } from "./RailwayData";
import { BetterMap } from "./BetterMap";
import { Rail } from "./Rail";
import { SerializedDataBase } from "./SerializedDataBase";
import { world } from "@minecraft/server";
import { Station } from "./Station";
import { Platform } from "./Platform";
import { Siding } from "./Siding";
import { Route } from "./Route";
import { Depot } from "./Depot";
import { decode, encode } from "libs/MessagePack/index";
import { NameColorDataBase } from "./NameColorDataBase";
import { ArrayList } from "jLib/ArrayList";
import { IReducedSaveData } from "./IReducedSaveData";

export class RailwayDataFileSaveModule extends RailwayDataModuleBase {

	private canAutoSave: boolean = false;
	private dataLoaded: boolean = false;
	private useReducedHash: boolean = true;
	private dynamicPropertiesWritten: number = 0;
	private dynamicPropertiesDeleted: number = 0;
	private autoSaveStartMillis: number = 0;

	private readonly signalBlocks: SignalBlocks;

	private readonly dirtyStationIds: ArrayList<number> = new ArrayList();
	private readonly dirtyPlatformIds: ArrayList<number> = new ArrayList();
	private readonly dirtySidingIds: ArrayList<number> = new ArrayList();
	private readonly dirtyRouteIds: ArrayList<number> = new ArrayList();
	private readonly dirtyDepotIds: ArrayList<number> = new ArrayList();
	private readonly dirtyLiftIds: ArrayList<number> = new ArrayList();
	private readonly dirtyRailPositions: ArrayList<BlockPos> = new ArrayList();
	private readonly dirtySignalBlocks: ArrayList<SignalBlock> = new ArrayList();

	private readonly existingFiles: Map<string, /*Integer*/number> = new Map();
	private readonly checkDynamicPropertiesToDelete: ArrayList<string> = new ArrayList();

	private readonly stationsDPIdBase: string;
	private readonly platformsDPIdBase: string;
	private readonly sidingsDPIdBase: string;
	private readonly routesDPIdBase: string;
	private readonly depotsDPIdBase: string;
	private readonly railsDPIdBase: string;
	private readonly signalBlocksDPIdBase: string;

	public constructor(railwayData: RailwayData, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, signalBlocks: SignalBlocks) {
		super(railwayData, rails);
		this.signalBlocks = signalBlocks;

		this.stationsDPIdBase = "mts/stations/";
		this.platformsDPIdBase = "mts/platforms/";
		this.sidingsDPIdBase = "mts/sidings/";
		this.routesDPIdBase = "mts/routes/";
		this.depotsDPIdBase = "mts/depots/";
		this.railsDPIdBase = "mts/rails/";
		this.signalBlocksDPIdBase = "mts/signal-blocks/";
	}

	public load(): void {
		this.existingFiles.clear();
		this.readMessagePackFromDP(this.stationsDPIdBase, map => new Station(map), v => this.railwayData.stations.add(v), false);
		this.readMessagePackFromDP(this.platformsDPIdBase, map => new Platform(map), v => this.railwayData.platforms.add(v), true);
		this.readMessagePackFromDP(this.sidingsDPIdBase, map => new Siding(map), v => this.railwayData.sidings.add(v), true);
		this.readMessagePackFromDP(this.routesDPIdBase, map => new Route(map), v => this.railwayData.routes.add(v), false);
		this.readMessagePackFromDP(this.depotsDPIdBase, map => new Depot(map), v => this.railwayData.depots.add(v), false);
		this.readMessagePackFromDP(this.railsDPIdBase, map => new RailEntry(map), railEntry => this.rails.set(railEntry.pos, railEntry.connections), true);
		this.readMessagePackFromDP(this.signalBlocksDPIdBase, map => new SignalBlock(map), v => this.signalBlocks.signalBlocks.push(v), true);

		const now = new Date();
		const dateTime = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;
		console.log("Minecraft Track System data successfully loaded for " + dateTime);
		this.canAutoSave = true;
		this.dataLoaded = true;
	}

	public fullSave(): void {
		this.useReducedHash = false;
		this.dirtyStationIds.clear();
		this.dirtyPlatformIds.clear();
		this.dirtySidingIds.clear();
		this.dirtyRouteIds.clear();
		this.dirtyDepotIds.clear();
		this.dirtyLiftIds.clear();
		this.dirtyRailPositions.clear();
		this.dirtySignalBlocks.clear();
		this.checkDynamicPropertiesToDelete.clear();
		this.autoSave();
		while (true) {
			if (this.autoSaveTick()) {
				break;
			}
		}
		this.canAutoSave = false;
	}

	public autoSave(): void {
		if (!this.dataLoaded) {
			this.dataLoaded = true;
			this.canAutoSave = true;
		}

		if (this.canAutoSave && this.checkDynamicPropertiesToDelete.isEmpty()) {
			this.autoSaveStartMillis = new Date().getTime();
			this.dynamicPropertiesWritten = 0;
			this.dynamicPropertiesDeleted = 0;
			this.dirtyStationIds.pushAll(this.railwayData.dataCache.stationIdMap.keys());
			this.dirtyPlatformIds.pushAll(this.railwayData.dataCache.platformIdMap.keys());
			this.dirtySidingIds.pushAll(this.railwayData.dataCache.sidingIdMap.keys());
			this.dirtyRouteIds.pushAll(this.railwayData.dataCache.routeIdMap.keys());
			this.dirtyDepotIds.pushAll(this.railwayData.dataCache.depotIdMap.keys());
			this.dirtyRailPositions.pushAll(this.rails.keys());
			this.dirtySignalBlocks.pushAll(this.signalBlocks.signalBlocks);
			this.checkDynamicPropertiesToDelete.pushAll(this.existingFiles.keys());
		}
	}

	public autoSaveTick(): boolean {
		if (this.canAutoSave) {
			const deleteEmptyOld = this.checkDynamicPropertiesToDelete.isEmpty();

			let hasSpareTime: boolean = this.writeDirtyDataToDP(this.dirtyStationIds, id => this.railwayData.dataCache.stationIdMap.get(id), id => id, this.stationsDPIdBase);
			if (hasSpareTime) {
				hasSpareTime = this.writeDirtyDataToDP(this.dirtyPlatformIds, id => this.railwayData.dataCache.platformIdMap.get(id), id => id, this.platformsDPIdBase);
			}
			if (hasSpareTime) {
				hasSpareTime = this.writeDirtyDataToDP(this.dirtySidingIds, id => this.railwayData.dataCache.sidingIdMap.get(id), id => id, this.sidingsDPIdBase);
			}
			if (hasSpareTime) {
				hasSpareTime = this.writeDirtyDataToDP(this.dirtyRouteIds, id => this.railwayData.dataCache.routeIdMap.get(id), id => id, this.routesDPIdBase);
			}
			if (hasSpareTime) {
				hasSpareTime = this.writeDirtyDataToDP(this.dirtyDepotIds, id => this.railwayData.dataCache.depotIdMap.get(id), id => id, this.depotsDPIdBase);
			}
			if (hasSpareTime) {
				hasSpareTime = this.writeDirtyDataToDP(this.dirtyRailPositions, pos => this.rails.has(pos) ? new RailEntry(pos, this.rails.get(pos)!) : undefined, pos => pos.asLong(), this.railsDPIdBase);
			}
			if (hasSpareTime) {
				hasSpareTime = this.writeDirtyDataToDP(this.dirtySignalBlocks, signalBlock => signalBlock, signalBlock => signalBlock.id, this.signalBlocksDPIdBase);
			}

			const doneWriting = this.dirtyStationIds.isEmpty() && this.dirtyPlatformIds.isEmpty() && this.dirtySidingIds.isEmpty() && this.dirtyRouteIds.isEmpty() && this.dirtyDepotIds.isEmpty() && this.dirtyLiftIds.isEmpty() && this.dirtyRailPositions.isEmpty() && this.dirtySignalBlocks.isEmpty();
			if (hasSpareTime && !this.checkDynamicPropertiesToDelete.isEmpty() && doneWriting) {
				const dynamicPropertyId = this.checkDynamicPropertiesToDelete.remove(0);
				
				world.setDynamicProperty(dynamicPropertyId, undefined);
				
				this.existingFiles.delete(dynamicPropertyId);
				this.dynamicPropertiesDeleted++;
			}

			if (!deleteEmptyOld && this.checkDynamicPropertiesToDelete.isEmpty()) {
				if (!this.useReducedHash || this.dynamicPropertiesWritten > 0 || this.dynamicPropertiesDeleted > 0) {
					const now = new Date();
					const dateTime = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;
					console.log("Minecraft Track System save complete for " + dateTime + " in " + (now.getTime() - this.autoSaveStartMillis) / 1000 + " second(s)");
					if (this.dynamicPropertiesWritten > 0) {
						console.log("- Changed: " + this.dynamicPropertiesWritten);
					}
					if (this.dynamicPropertiesDeleted > 0) {
						console.log("- Deleted: " + this.dynamicPropertiesDeleted);
					}
				}
			}

			return doneWriting && this.checkDynamicPropertiesToDelete.isEmpty();
		} else {
			return true;
		}
	}

	private readMessagePackFromDP<T extends SerializedDataBase>(DPIdBase: string, getData: (map: Record<string, unknown>) => T, callback: (a: T) => void, skipVerify: boolean): void {
		world.getDynamicPropertyIds().forEach(id => {
			if (id.startsWith(DPIdBase) && !id.endsWith("/")) {
				try {
					const idFileContext = world.getDynamicProperty(id) as string;
					const packed = new Uint8Array(Array.from(idFileContext, char => char.charCodeAt(0)))

					const result = decode(packed, { useBigInt64: true });

					const data = getData(result as any);
					if (skipVerify || !(data instanceof NameColorDataBase) || (data as NameColorDataBase).name.length != 0) {
						callback(data);
					}

					this.existingFiles.set(id, RailwayDataFileSaveModule.getHash(data, true));
				} catch (e) {
					console.error(e);
				}
			}
		})
	}

	private writeMessagePackToDP(data: SerializedDataBase, id: number | bigint, DPIdBase: string): string | null {
		const parentPath = DPIdBase + (typeof id == "bigint" ? (id % 100n) : (id % 100)).toString() + "/";
		try {
			const dataPath = parentPath + id;
			const hash = RailwayDataFileSaveModule.getHash(data, this.useReducedHash);

			if (!this.existingFiles.has(dataPath) || hash != this.existingFiles.get(dataPath)) {
				
				const bufferToStr = (arr: Uint8Array) => {
					const chunkSize = 1000;
					let result = '';
					
					for (let i = 0; i < arr.length; i += chunkSize) {
						const chunk = arr.slice(i, i + chunkSize);
						result += String.fromCharCode(...chunk);
					}
					
					return result;
				}

				const packed = encode(data.toMessagePack(), { useBigInt64: true })
				world.setDynamicProperty(dataPath, bufferToStr(packed));

				this.existingFiles.set(dataPath, hash);
				this.dynamicPropertiesWritten++;
			}

			return dataPath;
		} catch (e) {
			console.error(e);
		}
		return null;
	}

	private writeDirtyDataToDP<T extends SerializedDataBase, U>(dirtyData: ArrayList<U>, getId: (a: U) => T | undefined, idToLong: (a: U) => number | bigint, DPIdBase: string) {
		const millis = new Date().getTime();
		while (dirtyData.length != 0) {
			const id: U = dirtyData.remove(0);
			const data: T | undefined = getId(id);
			if (data != undefined) {
				const newPath = this.writeMessagePackToDP(data, idToLong(id), DPIdBase);
				if (newPath != null) {
					this.checkDynamicPropertiesToDelete.remove(newPath);
				}
			}
			if ((new Date().getTime()) - millis >= 2) {
				return false;
			}
		}
		return true;
	}

	private static getHash(data: SerializedDataBase, useReducedHash: boolean): number {
		// fnv1a hash
		const obj = useReducedHash && (data as unknown as IReducedSaveData).toReducedMessagePack != undefined ? (data as unknown as IReducedSaveData).toReducedMessagePack() : data.toMessagePack();
		const buffer = encode(obj, { useBigInt64: true });

		let hash = 0x811c9dc5;
		for (let i = 0; i < buffer.length; i++) {
			hash ^= buffer[i];
			hash = Math.imul(hash, 0x01000193)
		}

		return hash;
	}
}
