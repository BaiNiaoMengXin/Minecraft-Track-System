import { ArrayList } from "jLib/ArrayList";
import { RailwayDataModuleBase } from "./RailwayDataModuleBase";
import { SignalBlock, SignalBlocks } from "./SignalBlocks";
import { BlockPos } from "util/math/BlockPos";
import { RailEntry, RailwayData } from "./RailwayData";
import { BetterMap } from "./BetterMap";
import { Rail } from "./Rail";
import { SerializedDataBase } from "./SerializedDataBase";
import { Block, world } from "@minecraft/server";
import { Station } from "./Station";
import { Platform } from "./Platform";
import { Siding } from "./Siding";
import { Route } from "./Route";
import { Depot } from "./Depot";
import { RailAngle } from "./RailAngle";
import { MessagePackHelper } from "./MessagePackHelper";

// TODO temporary code start: It should not implement SerializedDataBase
export class RailwayDataFileSaveModule extends RailwayDataModuleBase implements SerializedDataBase {
// TODO temporary code end

	private readonly signalBlocks: SignalBlocks;

	public constructor(railwayData: RailwayData, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, signalBlocks: SignalBlocks) {
		super(railwayData, rails);
		this.signalBlocks = signalBlocks;
	}

	public load(map: Record<string, unknown>): void {
        const messagePackHelper = new MessagePackHelper(map as ReturnType<this['toMessagePack']>);
		this.railwayData.stations.clear();
		this.railwayData.platforms.clear();
		this.railwayData.sidings.clear();
		this.railwayData.routes.clear();
		this.railwayData.depots.clear();
		this.rails.clear();
		this.signalBlocks.signalBlocks.clear();

        messagePackHelper.iterateArrayValue("stations", station => this.railwayData.stations.add(new Station(station.asRecordValue())));
        messagePackHelper.iterateArrayValue("platforms", platform => this.railwayData.platforms.add(new Platform(platform.asRecordValue())));
        messagePackHelper.iterateArrayValue("sidings", siding => this.railwayData.sidings.add(new Siding(siding.asRecordValue())));
        messagePackHelper.iterateArrayValue("routes", route => this.railwayData.routes.add(new Route(route.asRecordValue())));
        messagePackHelper.iterateArrayValue("depots", depot => this.railwayData.depots.add(new Depot(depot.asRecordValue())));
        messagePackHelper.iterateArrayValue("rails", value => {
            const railEntry = new RailEntry(value.asRecordValue());
            this.rails.set(railEntry.pos, railEntry.connections);
        });
        messagePackHelper.iterateArrayValue("signalBlocks", signalBlock => this.signalBlocks.signalBlocks.push(new SignalBlock(signalBlock.asRecordValue())))

        const now = new Date();
        const dateTime = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}`;

		console.log("Minecraft Track System data successfully loaded for " + dateTime);
		world.sendMessage("§aMinecraft Track System data successfully loaded for " + dateTime);
	}

	public toMessagePack() {
        return {
            stations: Array.from(this.railwayData.stations, station => station.toMessagePack()),
            platforms: Array.from(this.railwayData.platforms, platform => platform.toMessagePack()),
            sidings: Array.from(this.railwayData.sidings, siding => siding.toMessagePack()),
            routes: Array.from(this.railwayData.routes, route => route.toMessagePack()),
            depots: Array.from(this.railwayData.depots, depot => depot.toMessagePack()),
            rails: Array.from(this.rails, ([pos, railMap]) => new RailEntry(pos, railMap).toMessagePack()),
            signalBlocks: Array.from(this.signalBlocks.signalBlocks, signalBlock => signalBlock.toMessagePack())
        } as const;
	}
}
