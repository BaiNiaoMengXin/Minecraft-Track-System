import { Rail } from "data/Rail";
import { BlockPos } from "util/math/BlockPos";
import { SerializedDataBase } from "data/SerializedDataBase";
import { UUID } from "jLib/UUID";
import { BigIntMath } from "jLib/Math";
import { MessagePackHelper } from "data/MessagePackHelper";


export class PathData extends SerializedDataBase {

    public rail: Rail;
    public savedRailBaseId: number;
    public dwellTime: number;
    public stopIndex: number;

    public startingPos: BlockPos;
    public endingPos: BlockPos;

    constructor(rail: Rail, savedRailBaseId: number, dwellTime: number, startingPos: BlockPos, endingPos: BlockPos, stopIndex: number);

    constructor(map: Record<string, unknown>);

    constructor(arg1: Rail | Record<string, unknown>, savedRailBaseId?: number, dwellTime?: number, startingPos?: BlockPos, endingPos?: BlockPos, stopIndex?: number) {
        super();
        if (savedRailBaseId) {
            this.rail = arg1 as Rail;
            this.savedRailBaseId = savedRailBaseId;
            this.dwellTime = dwellTime!;
            this.startingPos = startingPos!;
            this.endingPos = endingPos!;
            this.stopIndex = stopIndex!;
        } else {
            const messagePackHelper = new MessagePackHelper(arg1 as ReturnType<this['toMessagePack']>);

            // TODO temporary code
            this.rail = new Rail((arg1 as Record<string, unknown>)["rail"] as any);
            // TODO temporary code end
            this.savedRailBaseId = messagePackHelper.getDouble("saved_rail_base_id"),
            this.dwellTime = messagePackHelper.getInt("dwell_time");
            this.stopIndex = messagePackHelper.getInt("stop_index");
            this.startingPos = BlockPos.fromLong(messagePackHelper.getLong("starting_pos"));
            this.endingPos = BlockPos.fromLong(messagePackHelper.getLong("ending_pos"));
        }
    }

    public override toMessagePack() {
        return {
            rail: this.rail.toMessagePack(),

            saved_rail_base_id: this.savedRailBaseId,
            dwell_time: this.dwellTime,
            stop_index: this.stopIndex,
            starting_pos: this.startingPos.asLong(),
            ending_pos: this.endingPos.asLong()
        }
    }

    public isSameRail(pathData: PathData): boolean {
        return this.startingPos.equals(pathData.startingPos) && 
                this.endingPos.equals(pathData.endingPos);
    }

    public isOppositeRail(pathData: PathData): boolean {
        return this.startingPos.equals(pathData.endingPos) &&
                this.endingPos.equals(pathData.startingPos);
    }

    public getRailProduct() {
        return PathData.getRailProduct(this.startingPos, this.endingPos);
    }

    public static getRailProduct(startingPos: BlockPos, endingPos: BlockPos) {
        const startingPosLong = startingPos.asLong();
        const endingPosLong = endingPos.asLong();
        return new UUID(BigIntMath.min(startingPosLong, endingPosLong), BigIntMath.max(startingPosLong, endingPosLong));
    }
}
