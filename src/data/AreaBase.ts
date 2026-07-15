import { NameColorDataBase } from "./NameColorDataBase";
import { TransportMode } from "./TransportMode";
import { Tuple } from "util/Tuple";
import { RailwayData } from "./RailwayData";
import { BlockPos } from "util/math/BlockPos";
import { MessagePackHelper } from "./MessagePackHelper";

export abstract class AreaBase extends NameColorDataBase {

    public corner1: Tuple<number, number> | null = null;
    public corner2: Tuple<number, number> | null = null;

    public constructor();

    public constructor(id: number);

    public constructor(transportMode: TransportMode);

    public constructor(id: number, transportMode: TransportMode);

    public constructor(map: Record<string, unknown>)

    public constructor(arg1?: number | TransportMode | Record<string, unknown>, transportMode?: TransportMode) {
        if (arg1 == undefined) {
            super();
        } else if (!transportMode && typeof arg1 == "number") {
            super(arg1);
        } else if (arg1 instanceof TransportMode) {
            super(arg1);
        } else if (transportMode) {
            super(arg1 as number, transportMode);
        } else {
            super(arg1 as Record<string, unknown>);
            const messagePackHelper = new MessagePackHelper(arg1 as ReturnType<this['toMessagePack']>);
            this.setCorners(messagePackHelper.getInt("x_min"), messagePackHelper.getInt("z_min"), messagePackHelper.getInt("x_max"), messagePackHelper.getInt("z_max"));
        }
    }

    public override toMessagePack() {
        return {
            ...super.toMessagePack(),

            x_min: this.corner1 == null ? 0 : this.corner1.getA(),
            z_min: this.corner1 == null ? 0 : this.corner1.getB(),
            x_max: this.corner2 == null ? 0 : this.corner2.getA(),
            z_max: this.corner2 == null ? 0 : this.corner2.getB(),
        } as const;
    }

    public inArea(x: number, z: number): boolean {
        return AreaBase.nonNullCorners(this) && RailwayData.isBetween(x, this.corner1!.getA(), this.corner2!.getA()) && RailwayData.isBetween(z, this.corner1!.getB(), this.corner2!.getB());
    }

	public intersecting(areaBase: AreaBase): boolean {
		return AreaBase.nonNullCorners(this) && AreaBase.nonNullCorners(areaBase) && (this.inThis(areaBase) || areaBase.inThis(this));
	}

    public getCenter(): BlockPos | null {
        return AreaBase.nonNullCorners(this) ? RailwayData.newBlockPos((this.corner1!.getA() + this.corner2!.getA()) / 2, 0, (this.corner1!.getB(), this.corner2!.getB()) / 2) : null;
    }

    public setCorners(corner1a: number, corner1b: number, corner2a: number, corner2b: number): void {
        this.corner1 = corner1a == 0 && corner1b == 0 ? null : new Tuple(corner1a, corner1b);
        this.corner2 = corner2a == 0 && corner2b == 0 ? null : new Tuple(corner2a, corner2b);
    }

    private inThis(areaBase: AreaBase) {
        return this.inArea(areaBase.corner1!.getA(), areaBase.corner1!.getB()) || this.inArea(areaBase.corner1!.getA(), areaBase.corner2!.getB()) || this.inArea(areaBase.corner2!.getA(), areaBase.corner1!.getB()) || this.inArea(areaBase.corner2!.getA(), areaBase.corner2!.getB());
    }

    public static nonNullCorners(station: AreaBase | null): boolean {
        return station != null && station.corner1 != null && station.corner2 != null;
    }
}
