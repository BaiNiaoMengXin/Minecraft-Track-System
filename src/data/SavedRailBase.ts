import { NameColorDataBase } from "./NameColorDataBase";
import { RailwayData } from "./RailwayData";
import { TransportMode } from "./TransportMode";
import { Platform } from "./Platform";
import { BlockPos } from "util/math/BlockPos";
import { AreaBase } from "./AreaBase";
import { BetterMap } from "./BetterMap";
import { Rail } from "./Rail";
import { Double } from "jLib/Math";
import { AABB } from "util/AABB";
import { Direction } from "util/math/Direction";
import { MessagePackHelper } from "./MessagePackHelper";

export class SavedRailBase extends NameColorDataBase {
    protected dwellTime : number;
    private positions : BlockPos[];

    public static MAX_DWELL_TIME : number = 1200;
    private static DEFAULT_DWELL_TIME : number = 20;
    private static KEY_POS_1 : string = "pos_1";
    private static KEY_POS_2 : string = "pos_2";
    private static KEY_DWELL_TIME : string = "dwell_time";

    public constructor(id: number, transportMode: TransportMode, pos1: BlockPos, pos2: BlockPos);

    public constructor(transportMode: TransportMode, pos1: BlockPos, pos2: BlockPos);

    public constructor(map: Record<string, unknown>);

    public constructor(arg1: Record<string, unknown> | TransportMode | number, arg2?: BlockPos | TransportMode, arg3?: BlockPos, arg4?: BlockPos) {
        if (typeof arg1 === 'number') {
            super(arg1, arg2 as TransportMode);
            this.name = "1";
            this.positions = [];
            this.positions.push(arg3!);
            this.positions.push(arg4!);
            this.dwellTime = (arg2 as TransportMode).continuousMovement ? 1 : SavedRailBase.DEFAULT_DWELL_TIME;
        } else if (arg1 instanceof TransportMode) {
            super(arg1);
            this.name = "1";
            this.positions = [];
            this.positions.push(arg2 as BlockPos);
            this.positions.push(arg3 as BlockPos);
            this.dwellTime = arg1.continuousMovement ? 1 : SavedRailBase.DEFAULT_DWELL_TIME;
        } else {
            super(arg1 as Record<string, unknown>);
            const messagePackHelper = new MessagePackHelper(arg1 as ReturnType<this['toMessagePack']>);
            this.positions = [];
            this.positions.push(BlockPos.fromLong(messagePackHelper.getLong("pos_1")));
            this.positions.push(BlockPos.fromLong(messagePackHelper.getLong("pos_2")));
            this.dwellTime = this.transportMode.continuousMovement ? 1 : messagePackHelper.getInt("dwell_time");
        }
    }

    public override toMessagePack() {
        return {
            ...super.toMessagePack(),

            pos_1: this.getPosition(0).asLong(), 
            pos_2: this.getPosition(1).asLong(), 
            dwell_time: this.dwellTime
        } as const;
    }
    
    protected override hasTransportMode(): boolean {
		return true;
	}

    private getPosition(index: number): BlockPos {
		return this.positions.length > index ? this.positions[index] : RailwayData.newBlockPos(0, 0, 0);
	}

    getMidPos(zeroY: boolean = false): BlockPos {
        const pos : BlockPos = this.getPosition(0).offset(this.getPosition(1));
        return RailwayData.newBlockPos(pos.getX() / 2, zeroY ? 0 : pos.getY() / 2, pos.getZ() / 2);
    }

    getOrderedPositions(pos: BlockPos, reverse: boolean): [BlockPos, BlockPos] {
        const pos1 = this.getPosition(0);
        const pos2 = this.getPosition(1);
        const d1 = pos1.distSqr(pos);
        const d2 = pos2.distSqr(pos);
        const orderedPositions: BlockPos[] = [];
        if (d2 > d1 == reverse) {
            orderedPositions.push(pos2);
            orderedPositions.push(pos1);
        } else {Object
            orderedPositions.push(pos1);
            orderedPositions.push(pos2);
        }
        return orderedPositions as [BlockPos, BlockPos];
    }
    
    containsPos(pos: BlockPos): boolean {
        return this.positions!.some(item => item.equals(pos));
    }

    getOtherPosition(pos: BlockPos): BlockPos {
        const pos2 = this.getPosition(1);
        const pos1 = this.getPosition(0);
        return pos.equals(pos1) ? pos2 : pos1;
    }

	public static isInvalidSavedRail(rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, pos1: BlockPos, pos2: BlockPos): boolean {
		return !RailwayData.containsRail(rails, pos1, pos2) || !rails.get(pos1)?.get(pos2)?.railType.hasSavedRail;
	}


	public getAxis(): Direction.Axis {
		const difference = this.getPosition(0).subtract(this.getPosition(1));
		return Math.abs(difference.getX()) > Math.abs(difference.getZ()) ? Direction.Axis.X : Direction.Axis.Z;
	}

	public isInvalidSavedRail(rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>): boolean {
		const pos1 = this.getPosition(0);
		const pos2 = this.getPosition(1);
		return SavedRailBase.isInvalidSavedRail(rails, pos1, pos2) || SavedRailBase.isInvalidSavedRail(rails, pos2, pos1);
	}

	public  isCloseToSavedRail(pos: BlockPos, radius: number, lower: number, upper: number): boolean {
		const pos1 = this.getPosition(0);
		const pos2 = this.getPosition(1);
        const x1 = Math.min(pos1.getX(), pos2.getX());
        const y1 = Math.min(pos1.getY(), pos2.getY());
        const z1 = Math.min(pos1.getZ(), pos2.getZ());
        const x2 = Math.max(pos1.getX(), pos2.getX());
        const y2 = Math.max(pos1.getY(), pos2.getY());
        const z2 = Math.max(pos1.getZ(), pos2.getZ());
		return new AABB(x1 - radius, y1 - lower, z1 - radius, x2 + radius + 1, y2 + upper + 1, z2 + radius + 1).contains(pos.getX(), pos.getY(), pos.getZ());
	}

    getDwellTime(): number {
        if (this.dwellTime <= 0 || this.dwellTime > SavedRailBase.MAX_DWELL_TIME) {
            this.dwellTime = SavedRailBase.DEFAULT_DWELL_TIME;
        }
        return this.transportMode.continuousMovement ? 1 : this.dwellTime;
    }

	public setDwellTime(newDwellTime: number) {
		if (this.transportMode.continuousMovement) {
			this.dwellTime = 1;
		} else if (newDwellTime <= 0 || newDwellTime > SavedRailBase.MAX_DWELL_TIME) {
			this.dwellTime = SavedRailBase.DEFAULT_DWELL_TIME;
		} else {
			this.dwellTime = newDwellTime;
		}
	}
	
    public override compareTo(compare: NameColorDataBase): number {
        const thisIsNumber = !isNaN(parseFloat(this.name));
        const compareIsNumber = !isNaN(parseFloat(compare.name));
        
        if (thisIsNumber && compareIsNumber) {
            const floatCompare = Double.compare(parseFloat(this.name), parseFloat(compare.name));
            return floatCompare == 0 ? super.compareTo(compare) : floatCompare;
        } else if (thisIsNumber) {
            return -1;
        } else if (compareIsNumber) {
            return 1;
        } else {
            return super.compareTo(compare);
        }
    }
}
