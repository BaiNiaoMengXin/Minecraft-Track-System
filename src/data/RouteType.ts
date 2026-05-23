
export class RouteType {

	private static readonly $VALUES: Map<string, RouteType> = new Map();
      
	public static readonly NORMAL = new RouteType("NORMAL");
	public static readonly LIGHT_RAIL = new RouteType("LIGHT_RAIL");
	public static readonly HIGH_SPEED = new RouteType("HIGH_SPEED");

	private readonly $NAME: string

	private constructor($NAME: string) {
		this.$NAME = $NAME;
		RouteType.$VALUES.set($NAME, this);
	}

	public static values(): RouteType[] {
		return Array.from(this.$VALUES.values());
	}

	public static valueOf(str: string): RouteType {
		const result = this.$VALUES.get(str);
		return result ?? this.NORMAL;
	}

	public toString(): string {
		return this.$NAME;
	}

    public ordinal() : number {
        return RouteType.values().indexOf(this);
    }


	public next(): RouteType {
		return RouteType.values()[(this.ordinal() + 1) % RouteType.values().length];
	}
}


