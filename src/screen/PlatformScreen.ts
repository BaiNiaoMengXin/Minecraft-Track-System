import { Platform } from "data/Platform";
import { SavedRailScreenBase } from "./SavedRailScreenBase";
import { UIRawMessage } from "@minecraft/server-ui";
import { TransportMode } from "data/TransportMode";
import { TrainDashboardClient } from "./TrainDashboardClient";

export class PlatformScreen extends SavedRailScreenBase<Platform> {

	private static readonly DWELL_TIME_TEXT: UIRawMessage = { translate: "gui.mts.dwell_time" };

	public constructor(savedRailBase: Platform, transportMode: TransportMode, dashboardScreen: TrainDashboardClient) {
		super(savedRailBase, transportMode, dashboardScreen, PlatformScreen.DWELL_TIME_TEXT, "gui.mts.platform_number");
	}

	public override onClose(): void {
		const minutes = this.sliderDwellTimeMin.getData();
		const second = this.sliderDwellTimeSec.getData() / 2;
		console.log("PlatformScreen.onClose: " + minutes + " " + second)
		this.savedRailBase.setDwellTime((second + minutes * SavedRailScreenBase.SECONDS_PER_MINUTE) * 2);
	}
}
