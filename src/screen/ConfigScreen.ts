import { CustomForm, ObservableBoolean } from "@minecraft/server-ui";
import { TrainDashboardClient } from "./TrainDashboardClient";
import { MTS } from "MTS";
import { system } from "@minecraft/server";

export class ConfigScreen {

	private readonly customForm: CustomForm;
	private readonly dashboardScreen: TrainDashboardClient;

	private readonly toggleUseTimeSync: ObservableBoolean;

	public constructor(dashboardScreen: TrainDashboardClient) {
		this.customForm = new CustomForm(dashboardScreen.player, { translate: "gui.mts.mts_options" }).closeButton();
		this.dashboardScreen = dashboardScreen;

		this.toggleUseTimeSync = new ObservableBoolean(MTS.railwayData.getUseTimeSync(), { clientWritable: true });
		this.customForm.toggle({ translate: "gui.mts.use_time_sync" }, this.toggleUseTimeSync);
		this.toggleUseTimeSync.subscribe(toggled => MTS.railwayData.setUseTimeSync(toggled));
	}

	public show(): void {
		this.customForm.show().then(onfulfilled => {
			if (onfulfilled == "ClientClosed") {
				system.run(() => this.dashboardScreen.use());
			}
		});
	}
}
