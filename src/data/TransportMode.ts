export class TransportMode {
    static TRAIN = new TransportMode(Number.MAX_SAFE_INTEGER, false, true, true, true, 0);
    static BOAT = new TransportMode(1, false, true, true, true, 0);
    static CABLE_CAR = new TransportMode(1, true, false, false, false, -6);
    static AIRPLANE = new TransportMode(1, false, true, false, false, 0);

    public maxLength : number;
	public continuousMovement : boolean;
	public hasPitchAscending : boolean;
	public hasPitchDescending : boolean;
	public hasRouteTypeVariation : boolean;
	public railOffset : number;

    constructor(maxLength : number, continuousMovement : boolean, hasPitchAscending : boolean, hasPitchDescending : boolean, hasRouteTypeVariation : boolean, railOffset : number) {
        this.maxLength = maxLength;
        this.continuousMovement = continuousMovement;
        this.hasPitchAscending = hasPitchAscending;
        this.hasPitchDescending = hasPitchDescending;
        this.hasRouteTypeVariation = hasRouteTypeVariation;
        this.railOffset = railOffset;
    }

    // Enum extension
    toString() {
        if (this === TransportMode.TRAIN) return "TRAIN";
        if (this === TransportMode.BOAT) return "BOAT";
        if (this === TransportMode.CABLE_CAR) return "CABLE_CAR";
        if (this === TransportMode.AIRPLANE) return "AIRPLANE";
        return "TRAIN";
    }

    // Enum extension
    static fromString(str : string) {
        switch (str) {
            case "TRAIN": return TransportMode.TRAIN;
            case "BOAT": return TransportMode.BOAT;
            case "CABLE_CAR": return TransportMode.CABLE_CAR;
            case "AIRPLANE": return TransportMode.AIRPLANE;
            default: return TransportMode.TRAIN;
        }
    }
    
    // Enum extension
    static values() {
        return [
            this.TRAIN,
            this.BOAT,
            this.CABLE_CAR,
            this.AIRPLANE
        ]
    }
}
