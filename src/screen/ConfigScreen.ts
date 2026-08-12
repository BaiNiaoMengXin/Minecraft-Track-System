import { CustomForm, ObservableBoolean, ObservableNumber, ObservableUIRawMessage } from "@minecraft/server-ui";
import { TrainDashboardClient } from "./TrainDashboardClient";
import { MTS } from "MTS";
import { system } from "@minecraft/server";
import { Config } from "Config";

export class ConfigScreen {

	private readonly customForm: CustomForm;
	private readonly dashboardScreen: TrainDashboardClient;

	private readonly toggleUseTimeSync: ObservableBoolean;


	private readonly sliderTicksElapsedIfTrainInvaild: ObservableNumber;
	private readonly sliderTicksElapsedIfTrainInvaildLabel = new ObservableUIRawMessage({});


	public constructor(dashboardScreen: TrainDashboardClient) {
		this.customForm = new CustomForm(dashboardScreen.player, { translate: "gui.mts.mts_options" }).closeButton();
		this.dashboardScreen = dashboardScreen;

		this.toggleUseTimeSync = new ObservableBoolean(MTS.railwayData.getUseTimeSync(), { clientWritable: true });
		this.customForm.toggle({ translate: "gui.mts.use_time_sync" }, this.toggleUseTimeSync);
		this.toggleUseTimeSync.subscribe(toggled => MTS.railwayData.setUseTimeSync(toggled));



		this.sliderTicksElapsedIfTrainInvaild = new ObservableNumber(Config.ticksElapsedIfTrainInvaild, { clientWritable: true });
		this.customForm.slider({ translate: "gui.mts.tick_elapsed_when_out_of_loaded_chunks" }, this.sliderTicksElapsedIfTrainInvaild, 2, 35, { step: 1, description: this.sliderTicksElapsedIfTrainInvaildLabel });
		this.sliderTicksElapsedIfTrainInvaild.subscribe(newValue => {
			if (newValue < 13) {
				this.sliderTicksElapsedIfTrainInvaildLabel.setData({ translate: "gui.mts.sim_precision_high" });
			} else if (newValue >= 13 && newValue < 24) {
				this.sliderTicksElapsedIfTrainInvaildLabel.setData({ translate: "gui.mts.sim_balanced" });
			} else {
				this.sliderTicksElapsedIfTrainInvaildLabel.setData({ translate: "gui.mts.sim_precision_low_performance_good" });
			}
		})
	}

	public show(): void {
		this.customForm.show().then(onfulfilled => {
			Config.ticksElapsedIfTrainInvaild = this.sliderTicksElapsedIfTrainInvaild.getData();

			if (onfulfilled == "ClientClosed") {
				system.run(() => this.dashboardScreen.use());
			}
		});
	}
}
