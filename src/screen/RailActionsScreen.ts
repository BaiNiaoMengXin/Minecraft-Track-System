import { ActionFormData } from "@minecraft/server-ui";
import { MTS } from "MTS";
import { TrainDashboardClient } from "./TrainDashboardClient";
import { RailwayData } from "data/RailwayData";
import { system } from "@minecraft/server";
import { DeleteConfirmationScreen } from "./DeleteConfirmationScreen";
/*
export class RailActionsScreen {

	private readonly customForm: CustomForm;
	private readonly dashboardScreen: TrainDashboardClient;

	public constructor(dashboardScreen: TrainDashboardClient) {
		this.customForm = new CustomForm(dashboardScreen.player, { translate: "gui.mts.rail_actions" }).closeButton();
		this.dashboardScreen = dashboardScreen;

		MTS.railwayData.railwayDataRailActionsModule.railActions.forEach(railAction => {
			this.customForm.button({
				translate: "gui.mts." + railAction.railActionType.nameTranslation,
				with: {
					rawtext: [
						{ text: railAction.playerName },
						{ text: String(RailwayData.round(railAction.length, 1)) },
						{ translate: railAction.permutation.localizationKey }
					]
				}
			}, () => {
				this.customForm.close();
				system.run(() => new DeleteConfirmationScreen(this.dashboardScreen.player, (isDelete) => {
					if (isDelete) {
						MTS.railwayData.railwayDataRailActionsModule.removeRailAction(railAction.id);
						system.run(() => new RailActionsScreen(this.dashboardScreen).show());
					} else {
						system.run(() => this.show());
					}
				}, "").show());
			});
		});
	}

	public show(): void {
		this.customForm.show().then(onfulfilled => {
			if (onfulfilled == "ClientClosed") {
				system.run(() => this.dashboardScreen.use());
			}
		});
	}
}
*/


export class RailActionsScreen {

	private readonly form: ActionFormData;
	private readonly dashboardScreen: TrainDashboardClient;

	private readonly cacheList: Array<number> = [];

	public constructor(dashboardScreen: TrainDashboardClient) {
		this.form = new ActionFormData().title({ translate: "gui.mts.rail_actions" });
		this.dashboardScreen = dashboardScreen;

		MTS.railwayData.railwayDataRailActionsModule.railActions.forEach(railAction => {
			this.form.button({
				translate: "gui.mts." + railAction.railActionType.nameTranslation,
				with: {
					rawtext: [
						{ text: railAction.playerName },
						{ text: String(RailwayData.round(railAction.length, 1)) },
						{ translate: railAction.permutation.localizationKey }
					]
				}
			});
			this.cacheList.push(railAction.id);
		});
	}

	public show(): void {
		this.form.show(this.dashboardScreen.player).then(onfulfilled => {
			if (!onfulfilled.canceled) {
				MTS.railwayData.railwayDataRailActionsModule.removeRailAction(this.cacheList[onfulfilled.selection!]);
				new RailActionsScreen(this.dashboardScreen).show();
			} else {
				system.run(() => this.dashboardScreen.use());
			}
		});
	}
}
