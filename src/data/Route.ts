import { NameColorDataBase } from './NameColorDataBase';
import { TransportMode } from './TransportMode';
import { RouteType } from './RouteType';
import { ArrayList } from 'jLib/ArrayList';
import { MessagePackHelper } from './MessagePackHelper';

/**
 * It is a subclass withhin the "Route" class.
 */
export class RoutePlatform {
    public customDestination: string;
    public readonly platformId: number;

    constructor(platformId: number, customDestination: string = "") {
        this.platformId = platformId;
        this.customDestination = customDestination;
    }
}

/**
 * It is a subclass withhin the "Route" class.
 */
export class CircularState {

	private static readonly $VALUES: Map<string, CircularState> = new Map();
      
	public static readonly NONE = new CircularState("NONE");
	public static readonly CLOCKWISE = new CircularState("CLOCKWISE");
	public static readonly ANTICLOCKWISE = new CircularState("ANTICLOCKWISE");

	private readonly $NAME: string

	private constructor($NAME: string) {
		this.$NAME = $NAME;
		CircularState.$VALUES.set($NAME, this);
	}

	public static values(): CircularState[] {
		return Array.from(this.$VALUES.values());
	}

	public static valueOf(str: string): CircularState {
		const result = this.$VALUES.get(str);
		return result ?? this.NONE;
	}

	public toString(): string {
		return this.$NAME;
	}

    public ordinal() : number {
        return CircularState.values().indexOf(this);
    }
}


export class Route extends NameColorDataBase {
    public routeType: RouteType;
    public isLightRailRoute: boolean;
    public isHidden: boolean;
    public disableNextStationAnnouncements: boolean;
    public circularState: CircularState;
    public lightRailRouteNumber: string;
    public readonly platformIds: ArrayList<RoutePlatform>;
    
    public constructor(transportMode: TransportMode);

	public constructor(id: number, transportMode: TransportMode);

	public constructor(map: Record<string, unknown>)
	
    public constructor(arg1: TransportMode | number | Record<string, unknown>, arg2?: TransportMode) {
       if (arg1 instanceof TransportMode || arg2) {
			const id = arg2 ? arg1 as number : 0;
            const transportMode = arg2 ?? (arg1 as TransportMode);

			super(id, transportMode);
            this.platformIds = new ArrayList();
            this.routeType = RouteType.NORMAL;
            this.isLightRailRoute = false;
            this.circularState = CircularState.NONE;
            this.lightRailRouteNumber = "";
            this.isHidden = false;
            this.disableNextStationAnnouncements = false;
		} else {
            super(arg1 as Record<string, unknown>);
            const messagePackHelper = new MessagePackHelper(arg1 as ReturnType<this['toMessagePack']>);
            
            this.platformIds = new ArrayList()
            messagePackHelper.iterateArrayValue("platform_ids", platformId => this.platformIds.push(new RoutePlatform(platformId.asDouble())));

            const customDestinations: Array<string> = new Array();
            messagePackHelper.iterateArrayValue("custom_destinations", customDestination => customDestinations.push(customDestination.asString()));

            for (let i = 0; i < Math.min(this.platformIds.length, customDestinations.length); i++) {
                this.platformIds[i].customDestination = customDestinations[i];
            }

            this.routeType = RouteType.valueOf(messagePackHelper.getString("route_type"));
            this.isLightRailRoute = messagePackHelper.getBoolean("is_light_rail_route");
            this.isHidden = messagePackHelper.getBoolean("is_route_hidden");
            this.disableNextStationAnnouncements = messagePackHelper.getBoolean("disable_next_station_announcements");
            this.lightRailRouteNumber = messagePackHelper.getString("light_rail_route_number");
            this.circularState = CircularState.valueOf(messagePackHelper.getString("circular_state"))
        }
    }
    
    public override toMessagePack() {
        return {
            ...super.toMessagePack(),
            
            platform_ids: Array.from(this.platformIds, routePlatform => routePlatform.platformId),

            custom_destinations: Array.from(this.platformIds, routePlatform => routePlatform.customDestination),

            route_type: this.routeType.toString(),
            is_light_rail_route: this.isLightRailRoute,
            is_route_hidden: this.isHidden,
            disable_next_station_announcements: this.disableNextStationAnnouncements,
            light_rail_route_number: this.lightRailRouteNumber,
            circular_state: this.circularState.toString()
        } as const;
    }
    

    protected override hasTransportMode(): boolean {
		return true;
	}

    public getPlatformIdIndex(platformId: number): number {
        for (let i = 0; i < this.platformIds.length; i++) {
            if (this.platformIds[i].platformId === platformId) {
                return i;
            }
        }
        return -1;
    }

    public containsPlatformId(platformId: number): boolean {
        return this.getPlatformIdIndex(platformId) >= 0;
    }

    public getFirstPlatformId(): number {
        return this.platformIds.length === 0 ? 0 : this.platformIds[0].platformId;
    }

    public getLastPlatformId(): number {
        return this.platformIds.length === 0 ? 0 : this.platformIds[this.platformIds.length - 1].platformId;
    }

    public getDestination(index: number): string | null {
        for (let i = Math.min(this.platformIds.length - 1, index); i >= 0; i--) {
            const customDestination = this.platformIds[i].customDestination;
            if (Route.destinationIsReset(customDestination)) {
                return null;
            } else if (customDestination !== '') {
                return customDestination;
            }
        }
        return null;
    }

    public static destinationIsReset(destination: string): boolean {
        return destination === '\\r' || destination === '\\reset';
    }
}
