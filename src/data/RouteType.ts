
export class RouteType {

	private static readonly $VALUES: Array<RouteType> = [];
      
	public static readonly NORMAL = new RouteType("NORMAL");
	public static readonly LIGHT_RAIL = new RouteType("LIGHT_RAIL");
	public static readonly HIGH_SPEED = new RouteType("HIGH_SPEED");

	private readonly $NAME: string

	private constructor($NAME: string) {
		this.$NAME = $NAME;
		RouteType.$VALUES.push(this);
	}

	public static values(): RouteType[] {
		return Array.from(this.$VALUES);
	}

	public static valueOf(str: string): RouteType {
		const result = this.$VALUES.find(v => v.$NAME == str);
		return result ?? this.NORMAL;
	}

	public toString(): string {
		return this.$NAME;
	}

    public ordinal(): number {
        return RouteType.$VALUES.indexOf(this);
    }

	public next(): RouteType {
		return RouteType.$VALUES[(this.ordinal() + 1) % RouteType.$VALUES.length];
	}
}


