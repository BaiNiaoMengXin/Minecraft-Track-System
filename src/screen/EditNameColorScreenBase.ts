import { CustomForm, UIRawMessage } from "@minecraft/server-ui";
import { NameColorDataBase } from "data/NameColorDataBase";
import { DashboardScreen } from "./DashboardScreen";
import { BetterTextField } from "./BetterTextField";
import { DeleteConfirmationScreen } from "./DeleteConfirmationScreen";
import { IGui } from "data/IGui";
import { MTS } from "MTS";
import { Station } from "data/Station";
import { system } from "@minecraft/server";

export abstract class EditNameColorScreenBase<T extends NameColorDataBase> {

	protected readonly customForm: CustomForm;
	protected readonly data: T;
	protected readonly dashboardScreen: DashboardScreen;
	private readonly onCloseCallback: () => void;

	private readonly textFieldName: BetterTextField;

	private static readonly NAME_MAX_LENGTH = 64;

	public constructor(data: T, dashboardScreen: DashboardScreen, nameKey: string, onCloseCallback: () => void) {
		this.data = data;
		this.dashboardScreen = dashboardScreen;
		this.onCloseCallback = onCloseCallback;
		this.customForm = new CustomForm(dashboardScreen.player, "").closeButton();

		this.textFieldName = new BetterTextField({ translate: nameKey }, undefined, data.name, EditNameColorScreenBase.NAME_MAX_LENGTH).addToCustomForm(this.customForm);
		if (!dashboardScreen.isNew) {
			this.customForm.button({ translate: "gui.delete" }, () => {
				this.onDelete();
				this.onCloseCallback();
			});
		}
	}

	public onDelete() {
		this.customForm.close();

		system.run(() => new DeleteConfirmationScreen(this.dashboardScreen.player, isDelete => {
			if (isDelete) {
				switch (this.dashboardScreen.selectedTab) {
					case DashboardScreen.SelectedTab.STATIONS:
						MTS.railwayData.dataCache.stations.delete(this.data as any);
						break;
					case DashboardScreen.SelectedTab.ROUTES:
						MTS.railwayData.dataCache.routes.delete(this.data as any);
						break;
					case DashboardScreen.SelectedTab.DEPOTS:
						MTS.railwayData.dataCache.depots.delete(this.data as any);
						break;
				}
				MTS.railwayData.dataCache.sync();
				system.run(() => this.dashboardScreen.use());
			} else {
				system.run(() => this.show());
			}
		}, IGui.formatStationName(this.data.name)).show());
	}

	public show() {
		this.customForm.show().then(onfulfilled => {
			if (onfulfilled == "ClientClosed") {
				this.saveData();
				this.onCloseCallback();
			}
			this.onClose(onfulfilled == "ClientClosed");
		});
	}

	protected saveData(): void {
		this.data.name = this.textFieldName.getValue();
	}

	protected onClose(isClientClosed: boolean): void {
	}
}
