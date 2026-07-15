import { TransportMode } from "./TransportMode";

export const RAIL_SEG_COUNT = 6;

export class RailType {

	private static readonly $VALUES: Array<RailType> = [];
    
    static readonly WOODEN = new RailType("WOODEN", 20, 0x8B7355, false, true, true, "CURVE");
    static readonly STONE = new RailType("STONE", 40, 0x7F7F7F, false, true, true, "CURVE");
    static readonly EMERALD = new RailType("EMERALD", 60, 0x007C00, false, true, true, "CURVE");
    static readonly IRON = new RailType("IRON", 80, 0xA7A7A7, false, true, true, "CURVE");
    static readonly OBSIDIAN = new RailType("OBSIDIAN", 120, 0x8932B8, false, true, true, "CURVE");
    static readonly BLAZE = new RailType("BLAZE", 160, 0xFF681F, false, true, true, "CURVE");
    static readonly QUARTZ = new RailType("QUARTZ", 200, 0xFFFCF5, false, true, true, "CURVE");
    static readonly DIAMOND = new RailType("DIAMOND", 300, 0x5CDBD5, false, true, true, "CURVE");
    static readonly PLATFORM = new RailType("PLATFORM", 80, 0xFF0000, true, false, true, "CURVE");
    static readonly SIDING = new RailType("SIDING", 40, 0xFFFF00, true, false, true, "CURVE");
    static readonly TURN_BACK = new RailType("TURN_BACK", 80, 0x0000FF, false, false, true, "CURVE");
    static readonly CABLE_CAR = new RailType("CABLE_CAR", 30, 0xFFFAFA, false, true, true, "CABLE");
    static readonly CABLE_CAR_STATION = new RailType("CABLE_CAR_STATION", 2, 0xFFFAFA, false, true, true, "CURVE");
    static readonly RUNWAY = new RailType("RUNWAY", 300, 0x9CD9FF, false, true, false, "CURVE");
    static readonly AIRPLANE_DUMMY = new RailType("AIRPLANE_DUMMY", 900, 0x000000, false, true, false, "CURVE");
    static readonly NONE = new RailType("NONE", 20, 0x000000, false, false, true, "CURVE");

    private readonly $NAME: string;

    public readonly speedLimit: number;
    public readonly maxBlocksPerTick: number;
    public readonly color: number;
    public readonly hasSavedRail: boolean;
    public readonly canAccelerate: boolean;
    public readonly hasSignal: boolean;
    public readonly railSlopeStyle: string;

    constructor($NAME: string, speedLimit: number, color: number, hasSavedRail: boolean, canAccelerate: boolean, hasSignal: boolean, railSlopeStyle: string) {
        this.$NAME = $NAME;
        RailType.$VALUES.push(this);

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
        return RailType.$VALUES.indexOf(this);
    }

    public toString(): string {
        return this.$NAME;
    }

    public static valueOf(str: string): RailType {
        return this.$VALUES.find(railType => railType.$NAME == str) ?? this.NONE;
    }

    public static values() {
        return Array.from(this.$VALUES);
    }
}
