export class RailAngle {

    private static readonly $VALUES: Array<RailAngle> = [];

    public static readonly E = new RailAngle(0);
    public static readonly SEE = new RailAngle(22.5);
    public static readonly SE = new RailAngle(45);
    public static readonly SSE = new RailAngle(67.5);
    public static readonly S = new RailAngle(90);
    public static readonly SSW = new RailAngle(112.5);
    public static readonly SW = new RailAngle(135);
    public static readonly SWW = new RailAngle(157.5);
    public static readonly W = new RailAngle(180);
    public static readonly NWW = new RailAngle(202.5);
    public static readonly NW = new RailAngle(225);
    public static readonly NNW = new RailAngle(247.5);
    public static readonly N = new RailAngle(270);
    public static readonly NNE = new RailAngle(292.5);
    public static readonly NE = new RailAngle(315);
    public static readonly NEE = new RailAngle(337.5);


    public readonly angleDegrees: number;
    public readonly angleRadians: number;
    public readonly sin: number;
    public readonly cos: number;
    public readonly tan: number;
    public readonly halfTan: number;

    private static readonly DEGREES_IN_CIRCLE = 360;
    private static readonly QUADRANTS = this.$VALUES.length;
    private static readonly ANGLE_INCREMENT = RailAngle.DEGREES_IN_CIRCLE / RailAngle.QUADRANTS;

    constructor(angleDegrees: number) {
        this.angleDegrees = RailAngle.normalizeAngle(angleDegrees);
        this.angleRadians = this.angleDegrees * Math.PI / 180;
        this.sin = Math.sin(this.angleRadians);
        this.cos = Math.cos(this.angleRadians);
        this.tan = Math.tan(this.angleRadians);
        this.halfTan = Math.tan(this.angleRadians / 2);

        RailAngle.$VALUES.push(this);
    }

    getOpposite() {
        switch (this) {
            default:
                return RailAngle.W;
            case RailAngle.SEE:
                return RailAngle.NWW;
            case RailAngle.SE:
                return RailAngle.NW;
            case RailAngle.SSE:
                return RailAngle.NNW;
            case RailAngle.S:
                return RailAngle.N;
            case RailAngle.SSW:
                return RailAngle.NNE;
            case RailAngle.SW:
                return RailAngle.NE;
            case RailAngle.SWW:
                return RailAngle.NEE;
            case RailAngle.W:
                return RailAngle.E;
            case RailAngle.NWW:
                return RailAngle.SEE;
            case RailAngle.NW:
                return RailAngle.SE;
            case RailAngle.NNW:
                return RailAngle.SSE;
            case RailAngle.N:
                return RailAngle.S;
            case RailAngle.NNE:
                return RailAngle.SSW;
            case RailAngle.NE:
                return RailAngle.SW;
            case RailAngle.NEE:
                return RailAngle.SWW;
        }
    }

    add(railAngle: RailAngle) {
        return RailAngle.fromAngle(this.angleDegrees + railAngle.angleDegrees);
    }

    sub(railAngle: RailAngle) {
        return RailAngle.fromAngle(this.angleDegrees - railAngle.angleDegrees);
    }

    isParallel(railAngle: RailAngle) {
        return this === railAngle || this === railAngle.getOpposite();
    }

    similarFacing(newAngleDegrees: number) {
        return RailAngle.similarFacing(this.angleDegrees, newAngleDegrees);
    }

    static similarFacing(angleDegrees1: number, angleDegrees2: number) {
        return Math.abs(RailAngle.normalizeAngle(angleDegrees1 - angleDegrees2)) < RailAngle.DEGREES_IN_CIRCLE / 4;
    }

    static getQuadrant(angleDegrees: number, include225: boolean) {
        const factor = include225 ? 1 : 2;
        return Math.round((RailAngle.normalizeAngle(angleDegrees) + RailAngle.DEGREES_IN_CIRCLE) / RailAngle.ANGLE_INCREMENT / factor) % (RailAngle.QUADRANTS / factor);
    }

    static fromAngle(angleDegrees: number) {
        return this.$VALUES[RailAngle.getQuadrant(angleDegrees, true)];
    }

    static normalizeAngle(angleDegrees: number) {
        let additional = 0;
        while (angleDegrees + additional < -RailAngle.DEGREES_IN_CIRCLE / 2) {
            additional += RailAngle.DEGREES_IN_CIRCLE;
        }
        while (angleDegrees + additional >= RailAngle.DEGREES_IN_CIRCLE / 2) {
            additional -= RailAngle.DEGREES_IN_CIRCLE;
        }
        return angleDegrees + additional;
    }

    static values(): ReadonlyArray<RailAngle> {
        return this.$VALUES;
    }
}
