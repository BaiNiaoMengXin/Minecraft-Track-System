import { TransportMode } from "./TransportMode";

export const RAIL_SEG_COUNT = 6;

export class RailType {

    static readonly WOODEN = new RailType(20, 0x8B7355, false, true, true, "CURVE");
    static readonly STONE = new RailType(40, 0x7F7F7F, false, true, true, "CURVE");
    static readonly EMERALD = new RailType(60, 0x007C00, false, true, true, "CURVE");
    static readonly IRON = new RailType(80, 0xA7A7A7, false, true, true, "CURVE");
    static readonly OBSIDIAN = new RailType(120, 0x8932B8, false, true, true, "CURVE");
    static readonly BLAZE = new RailType(160, 0xFF681F, false, true, true, "CURVE");
    static readonly QUARTZ = new RailType(200, 0xFFFCF5, false, true, true, "CURVE");
    static readonly DIAMOND = new RailType(300, 0x5CDBD5, false, true, true, "CURVE");
    static readonly PLATFORM = new RailType(80, 0xFF0000, true, false, true, "CURVE");
    static readonly SIDING = new RailType(40, 0xFFFF00, true, false, true, "CURVE");
    static readonly TURN_BACK = new RailType(80, 0x0000FF, false, false, true, "CURVE");
    static readonly CABLE_CAR = new RailType(30, 0xFFFAFA, false, true, true, "CABLE");
    static readonly CABLE_CAR_STATION = new RailType(2, 0xFFFAFA, false, true, true, "CURVE");
    static readonly RUNWAY = new RailType(300, 0x9CD9FF, false, true, false, "CURVE");
    static readonly AIRPLANE_DUMMY = new RailType(900, 0x000000, false, true, false, "CURVE");
    static readonly NONE = new RailType(20, 0x000000, false, false, true, "CURVE");

    public speedLimit: number;
    public maxBlocksPerTick: number;
    public color: number;
    public hasSavedRail: boolean;
    public canAccelerate: boolean;
    public hasSignal: boolean;
    public railSlopeStyle: string;

    constructor(speedLimit: number, color: number, hasSavedRail: boolean, canAccelerate: boolean, hasSignal: boolean, railSlopeStyle: string) {
        this.speedLimit = speedLimit;
        this.maxBlocksPerTick = speedLimit / 3.6 / 20;
        this.color = color | 0xFF000000;
        this.hasSavedRail = hasSavedRail;
        this.canAccelerate = canAccelerate;
        this.hasSignal = hasSignal;
        this.railSlopeStyle = railSlopeStyle;
    }

    static getDefaultMaxBlocksPerTick(transportMode: TransportMode) {
        return (transportMode.continuousMovement ? RailType.CABLE_CAR_STATION : RailType.WOODEN).maxBlocksPerTick;
    }

    public ordinal(): number {
        return RailType.values().indexOf(this);
    }

    // Enum extension

    toString() {
        if (JSON.stringify(this) == JSON.stringify(RailType.WOODEN)) return "WOODEN";
        if (JSON.stringify(this) == JSON.stringify(RailType.STONE)) return "STONE";
        if (JSON.stringify(this) == JSON.stringify(RailType.EMERALD)) return "EMERALD";
        if (JSON.stringify(this) == JSON.stringify(RailType.IRON)) return "IRON";
        if (JSON.stringify(this) == JSON.stringify(RailType.OBSIDIAN)) return "OBSIDIAN";
        if (JSON.stringify(this) == JSON.stringify(RailType.BLAZE)) return "BLAZE";
        if (JSON.stringify(this) == JSON.stringify(RailType.QUARTZ)) return "QUARTZ";
        if (JSON.stringify(this) == JSON.stringify(RailType.DIAMOND)) return "DIAMOND";
        if (JSON.stringify(this) == JSON.stringify(RailType.PLATFORM)) return "PLATFORM";
        if (JSON.stringify(this) == JSON.stringify(RailType.SIDING)) return "SIDING";
        if (JSON.stringify(this) == JSON.stringify(RailType.TURN_BACK)) return "TURN_BACK";
        if (JSON.stringify(this) == JSON.stringify(RailType.CABLE_CAR)) return "CABLE_CAR";
        if (JSON.stringify(this) == JSON.stringify(RailType.CABLE_CAR_STATION)) return "CABLE_CAR_STATION";
        if (JSON.stringify(this) == JSON.stringify(RailType.RUNWAY)) return "RUNWAY";
        if (JSON.stringify(this) == JSON.stringify(RailType.AIRPLANE_DUMMY)) return "AIRPLANE_DUMMY";
        return "NONE";
    }

    static valueOf(str: string) {
        switch (str) {
            case "WOODEN": return RailType.WOODEN;
            case "STONE": return RailType.STONE;
            case "EMERALD": return RailType.EMERALD;
            case "IRON": return RailType.IRON;
            case "OBSIDIAN": return RailType.OBSIDIAN;
            case "BLAZE": return RailType.BLAZE;
            case "QUARTZ": return RailType.QUARTZ;
            case "DIAMOND": return RailType.DIAMOND;
            case "PLATFORM": return RailType.PLATFORM;
            case "SIDING": return RailType.SIDING;
            case "TURN_BACK": return RailType.TURN_BACK;
            case "CABLE_CAR": return RailType.CABLE_CAR;
            case "CABLE_CAR_STATION": return RailType.CABLE_CAR_STATION;
            case "RUNWAY": return RailType.RUNWAY;
            case "AIRPLANE_DUMMY": return RailType.AIRPLANE_DUMMY;
            default: return RailType.IRON;
        }
    }

    // Enum extension
    static values() {
        return [
            this.WOODEN,
            this.STONE,
            this.EMERALD,
            this.IRON,
            this.OBSIDIAN,
            this.BLAZE,
            this.QUARTZ,
            this.DIAMOND,
            this.PLATFORM,
            this.SIDING,
            this.TURN_BACK,
            this.CABLE_CAR,
            this.CABLE_CAR_STATION,
            this.RUNWAY,
            this.AIRPLANE_DUMMY
        ]
    }
}
