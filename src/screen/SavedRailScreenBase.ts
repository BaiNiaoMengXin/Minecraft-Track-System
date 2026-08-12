import { CustomForm, ObservableNumber, ObservableString, ObservableUIRawMessage, UIRawMessage } from "@minecraft/server-ui";
import { SavedRailBase } from "data/SavedRailBase";
import { TrainDashboardClient } from "./TrainDashboardClient";
import { TransportMode } from "data/TransportMode";
import { Platform } from "data/Platform";
import { BetterTextField, TextFieldFilter } from "./BetterTextField";

export abstract class SavedRailScreenBase<T extends SavedRailBase> {

	protected readonly customForm: CustomForm;
	protected readonly dashboardScreen: TrainDashboardClient;

	protected readonly savedRailBase: T;
	protected readonly showScheduleControls: boolean;
	protected readonly sliderDwellTimeMin: ObservableNumber;
	protected readonly sliderDwellTimeSec: ObservableNumber;

	private readonly textFieldSavedRailNumber: BetterTextField;

	private readonly savedRailNumberWarringText = new ObservableUIRawMessage({});

	protected static readonly SECONDS_PER_MINUTE = 60;
	private static readonly MAX_SAVED_RAIL_NUMBER_VALUE = 9;
	private static readonly MIN_SAVED_RAIL_NUMBER_VALUE = 0;

	public constructor(savedRailBase: T, transportMode: TransportMode, dashboardScreen: TrainDashboardClient, dwellTimeLabel: UIRawMessage, numberStringKey: string) {
		this.customForm = new CustomForm(dashboardScreen.player, "").closeButton();

		this.savedRailBase = savedRailBase;
		this.showScheduleControls = !transportMode.continuousMovement;
		this.dashboardScreen = dashboardScreen;

		this.customForm.label(this.savedRailNumberWarringText).spacer();
		this.textFieldSavedRailNumber = new BetterTextField({ translate: numberStringKey }, TextFieldFilter.POSITIVE_INTEGER, savedRailBase.name, 1, text => {
			const newNumber = parseInt(text);
			if (isNaN(newNumber)) {
				this.savedRailNumberWarringText.setData({ translate: "gui.mts.number_invalid" });
			} else {
				this.savedRailNumberWarringText.setData({});
				savedRailBase.name = text;
			}
		}).addToCustomForm(this.customForm);

		this.sliderDwellTimeMin = new ObservableNumber(savedRailBase.getDwellTime() / 2 / SavedRailScreenBase.SECONDS_PER_MINUTE, { clientWritable: true });
		this.sliderDwellTimeMin.subscribe(() => this.dwellTimeChange());
		this.sliderDwellTimeSec = new ObservableNumber(savedRailBase.getDwellTime() % (SavedRailScreenBase.SECONDS_PER_MINUTE * 2), { clientWritable: true });
		this.sliderDwellTimeSec.subscribe(() => this.dwellTimeChange());

		if (this.showScheduleControls) {
			this.customForm.label(dwellTimeLabel).spacer();

			this.customForm.slider({ translate: "gui.mts.arrival_min" }, this.sliderDwellTimeMin, 0, ~~(Platform.MAX_DWELL_TIME / 2 / SavedRailScreenBase.SECONDS_PER_MINUTE), { step: 1 });
			this.customForm.slider({ translate: "gui.mts.arrival_sec" }, this.sliderDwellTimeSec, 0, SavedRailScreenBase.SECONDS_PER_MINUTE * 2 - 1, { step: 1 });
		}
	}

	public show() {
		this.customForm.show().then(onfulfilled => this.onClose(onfulfilled == "ServerClosed", onfulfilled == "ClientClosed", onfulfilled == "UserBusy"));
	}

	private dwellTimeChange() {
		if (this.showScheduleControls) {
			const maxMin = ~~(Platform.MAX_DWELL_TIME / 2 / SavedRailScreenBase.SECONDS_PER_MINUTE);
			if (this.sliderDwellTimeMin!.getData() == 0 && this.sliderDwellTimeSec!.getData() == 0) {
				this.sliderDwellTimeSec!.setData(1);
			}
			if (this.sliderDwellTimeMin!.getData() == maxMin && this.sliderDwellTimeSec!.getData() > Platform.MAX_DWELL_TIME % (SavedRailScreenBase.SECONDS_PER_MINUTE * 2)) {
				this.sliderDwellTimeSec!.setData(Platform.MAX_DWELL_TIME % (SavedRailScreenBase.SECONDS_PER_MINUTE * 2));
			}
		}
	}
	
	protected abstract onClose(isServerClosed: boolean, isClientClosed: boolean, isUserBusy: boolean): void;
}
