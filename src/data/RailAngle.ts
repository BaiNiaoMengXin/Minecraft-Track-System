export class RailAngle {
    static E = new RailAngle(0);
    static SEE = new RailAngle(22.5);
    static SE = new RailAngle(45);
    static SSE = new RailAngle(67.5);
    static S = new RailAngle(90);
    static SSW = new RailAngle(112.5);
    static SW = new RailAngle(135);
    static SWW = new RailAngle(157.5);
    static W = new RailAngle(180);
    static NWW = new RailAngle(202.5);
    static NW = new RailAngle(225);
    static NNW = new RailAngle(247.5);
    static N = new RailAngle(270);
    static NNE = new RailAngle(292.5);
    static NE = new RailAngle(315);
    static NEE = new RailAngle(337.5);

    
    public angleDegrees : number;
    public angleRadians : number;
    public sin : number;
    public cos : number;
    public tan : number;
    public halfTan : number;

    static DEGREES_IN_CIRCLE = 360;
    static QUADRANTS = 16;
    static ANGLE_INCREMENT = RailAngle.DEGREES_IN_CIRCLE / RailAngle.QUADRANTS;

    constructor(angleDegrees : number) {
        this.angleDegrees = RailAngle.normalizeAngle(angleDegrees);
        this.angleRadians = this.angleDegrees * Math.PI / 180;
        this.sin = Math.sin(this.angleRadians);
        this.cos = Math.cos(this.angleRadians);
        this.tan = Math.tan(this.angleRadians);
        this.halfTan = Math.tan(this.angleRadians / 2);
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
        const values = [
            RailAngle.E, RailAngle.SEE, RailAngle.SE, RailAngle.SSE,
            RailAngle.S, RailAngle.SSW, RailAngle.SW, RailAngle.SWW,
            RailAngle.W, RailAngle.NWW, RailAngle.NW, RailAngle.NNW,
            RailAngle.N, RailAngle.NNE, RailAngle.NE, RailAngle.NEE
        ];
        return values[RailAngle.getQuadrant(angleDegrees, true)];
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
    
    toString() {
        switch (this) {
            case RailAngle.E:
                return "E";
            case RailAngle.SEE:
                return "SEE";
            case RailAngle.SE:
                return "SE";
            case RailAngle.SSE:
                return "SSE";
            case RailAngle.S:
                return "S";
            case RailAngle.SSW:
                return "SSW";
            case RailAngle.SW:
                return "SW";
            case RailAngle.SWW:
                return "SWW";
            case RailAngle.W:
                return "W";
            case RailAngle.NWW:
                return "NWW";
            case RailAngle.NW:
                return "NW";
            case RailAngle.NNW:
                return "NNW";
            case RailAngle.N:
                return "N";
            case RailAngle.NNE:
                return "NNE";
            case RailAngle.NE:
                return "NE";
            case RailAngle.NEE:
                return "NEE";
            default:
                return "undefined";
        }
    }

    static fromString(angleStr: string) {
        switch (angleStr) {
            case "E":
                return RailAngle.E;
            case "SEE":
                return RailAngle.SEE;
            case "SE":
                return RailAngle.SE;
            case "SSE":
                return RailAngle.SSE;
            case "S":
                return RailAngle.S;
            case "SSW":
                return RailAngle.SSW;
            case "SW":
                return RailAngle.SW;
            case "SWW":
                return RailAngle.SWW;
            case "W":
                return RailAngle.W;
            case "NWW":
                return RailAngle.NWW;
            case "NW":
                return RailAngle.NW;
            case "NNW":
                return RailAngle.NNW;
            case "N":
                return RailAngle.N;
            case "NNE":
                return RailAngle.NNE;
            case "NE":
                return RailAngle.NE;
            case "NEE":
                return RailAngle.NEE;
            default:
                return RailAngle.E;
        }
    }
}
