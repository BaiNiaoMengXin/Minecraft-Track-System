import { CircularState, Route, RoutePlatform } from "data/Route";
import { EditNameColorScreenBase } from "./EditNameColorScreenBase";
import { RouteType } from "data/RouteType";
import { BetterTextField } from "./BetterTextField";
import { ObservableBoolean, ObservableUIRawMessage } from "@minecraft/server-ui";
import { TrainDashboardClient } from "./TrainDashboardClient";
import { MTS } from "MTS";
import { system } from "@minecraft/server";

export class EditRouteScreen extends EditNameColorScreenBase<Route> {

	private routeType!: RouteType;

	private readonly textFieldLightRailRouteNumber: BetterTextField;
	private readonly buttonRouteTypeLabel = new ObservableUIRawMessage({});
	private readonly toggleIsLightRailRoute = new ObservableBoolean(false, { clientWritable: true });
	private readonly toggleIsRouteHidden = new ObservableBoolean(false, { clientWritable: true });
	private readonly toggleDisableNextStationAnnouncements = new ObservableBoolean(false, { clientWritable: true });
	private readonly toggleIsClockwiseRoute = new ObservableBoolean(false, { clientWritable: true });
	private readonly toggleIsAntiClockwiseRoute = new ObservableBoolean(false, { clientWritable: true });

	private readonly isCircular: boolean;

	public constructor(route: Route, dashboardScreen: TrainDashboardClient, onCloseCallback: () => void) {
		super(route, dashboardScreen, "gui.mts.route_name", onCloseCallback);

		this.customForm.button({ translate: "gui.mts.edit_route" }, () => {
			this.saveData();
			this.customForm.close();
			const saved = () => {
				this.data.platformIds.clear()
				dashboardScreen.tempSelectSavedRails.forEach(s => {

					this.data.platformIds.push(new RoutePlatform(s.id))
				})

				system.run(() => this.show());
			}
			dashboardScreen.tempSelectSavedRails.clear()
			this.data.platformIds.forEach(p => 
				dashboardScreen.tempSelectSavedRails.push(MTS.railwayData.dataCache.platformIdMap.get(p.platformId)!)
			)
			dashboardScreen.updateSelectStationsPage(() => saved())
			dashboardScreen.showSelectStationsPage(() => saved())
		});

		if (route.platformIds.length > 0) {
			const firstStation = MTS.railwayData.dataCache.platformIdToStation.get(route.getFirstPlatformId());
			const lastStation = MTS.railwayData.dataCache.platformIdToStation.get(route.getLastPlatformId());
			this.isCircular = firstStation != null && lastStation != null && firstStation.id == lastStation.id;
		} else {
			this.isCircular = false;
		}

		this.textFieldLightRailRouteNumber = new BetterTextField({ translate: "gui.mts.light_rail_route_number" }, undefined, this.data.lightRailRouteNumber, 32).addToCustomForm(this.customForm);

		if (this.data.transportMode.hasRouteTypeVariation) {
			this.setRouteTypeText(this.data.routeType);
			this.customForm.button(this.buttonRouteTypeLabel, () => this.setRouteTypeText(this.routeType.next()));
		}
		this.customForm.toggle({ translate: "gui.mts.is_light_rail_route" }, this.toggleIsLightRailRoute);
		this.toggleIsLightRailRoute.subscribe(toggled => this.setIsLightRailRoute(toggled));
		this.customForm.toggle({ translate: "gui.mts.is_route_hidden" }, this.toggleIsRouteHidden);
		this.toggleIsRouteHidden.subscribe(toggled => this.setIsRouteHidden(toggled));
		this.customForm.toggle({ translate: "gui.mts.disable_next_station_announcements" }, this.toggleDisableNextStationAnnouncements);
		this.toggleDisableNextStationAnnouncements.subscribe(toggled => this.setDisableNextStationAnnouncements(toggled));
		if (this.isCircular) {
			this.customForm.toggle({ translate: "gui.mts.is_clockwise_route" }, this.toggleIsClockwiseRoute);
			this.toggleIsClockwiseRoute.subscribe(toggled => this.setIsClockwise(toggled));
			this.customForm.toggle({ translate: "gui.mts.is_anticlockwise_route" }, this.toggleIsAntiClockwiseRoute);
			this.toggleIsAntiClockwiseRoute.subscribe(toggled => this.setIsAntiClockwise(toggled));
		}

		this.setIsLightRailRoute(this.data.isLightRailRoute);
		this.setIsRouteHidden(this.data.isHidden);
		this.setDisableNextStationAnnouncements(this.data.disableNextStationAnnouncements);
		this.setIsClockwise(this.data.circularState == CircularState.CLOCKWISE);
		this.setIsAntiClockwise(this.data.circularState == CircularState.ANTICLOCKWISE);
	}

	protected override saveData() {
		super.saveData();

		this.data.routeType = this.routeType;
		this.data.isLightRailRoute = this.toggleIsLightRailRoute.getData();
		this.data.lightRailRouteNumber = this.textFieldLightRailRouteNumber.getValue();
		this.data.isHidden = this.toggleIsRouteHidden.getData();
		this.data.disableNextStationAnnouncements = this.toggleDisableNextStationAnnouncements.getData();

		if (this.isCircular) {
			this.data.circularState = this.toggleIsClockwiseRoute.getData() ? CircularState.CLOCKWISE : this.toggleIsAntiClockwiseRoute.getData() ? CircularState.ANTICLOCKWISE : CircularState.NONE;
		} else {
			this.data.circularState = CircularState.NONE;
		}
	}

	private setRouteTypeText(newRouteType: RouteType) {
		this.routeType = newRouteType;
		this.buttonRouteTypeLabel.setData({ translate: `gui.mts.route_type_${this.data.transportMode.toString()}_${this.routeType.toString()}`.toLowerCase() });
	}

	private setIsLightRailRoute(isLightRailRoute: boolean) {
		this.toggleIsLightRailRoute.setData(isLightRailRoute);
		this.textFieldLightRailRouteNumber.setVisible(isLightRailRoute);
	}

	private setIsRouteHidden(isRouteHidden: boolean) {
		this.toggleIsRouteHidden.setData(isRouteHidden);
	}

	private setDisableNextStationAnnouncements(hasNextStationAnnouncements: boolean) {
		this.toggleDisableNextStationAnnouncements.setData(hasNextStationAnnouncements);
	}

	private setIsClockwise(isClockwise: boolean) {
		this.toggleIsClockwiseRoute.setData(isClockwise);
		if (isClockwise) {
			this.toggleIsAntiClockwiseRoute.setData(false);
		}
	}

	private setIsAntiClockwise(isAntiClockwise: boolean) {
		this.toggleIsAntiClockwiseRoute.setData(isAntiClockwise);
		if (isAntiClockwise) {
			this.toggleIsClockwiseRoute.setData(false);
		}
	}
}
