import { Siding } from "data/Siding";
import { SavedRailScreenBase } from "./SavedRailScreenBase";
import { CustomForm, ObservableBoolean, ObservableNumber, ObservableString, ObservableUIRawMessage, UIRawMessage } from "@minecraft/server-ui";
import { TransportMode } from "data/TransportMode";
import { TrainDashboardClient } from "./TrainDashboardClient";
import { BetterTextField, TextFieldFilter } from "./BetterTextField";
import { Train } from "data/Train";
import { RailwayData } from "data/RailwayData";
import { RailType } from "data/RailType";
import { Mth } from "util/math/Mth";
import { TrainRegistry } from "extensions/TrainRegistry";
import { system } from "@minecraft/server";
import { NameColorDataBase } from "data/NameColorDataBase";
import { TrainProperties } from "extensions/TrainProperties";
import { TrainType } from "data/TrainType";
import { ArrayList } from "jLib/ArrayList";

export class SidingScreen extends SavedRailScreenBase<Siding> {

	private readonly oldAcceleration: number;
	private readonly oldIsManual: boolean;
	private readonly oldMaxManualSpeed: number;
	private readonly oldDwellTime: number;

	private readonly transportMode: TransportMode;
	private readonly buttonSelectTrainLabel = new ObservableUIRawMessage({});
	private readonly toggleUnlimitedTrains: ObservableBoolean;
	private readonly textFieldMaxTrains: BetterTextField;
	private readonly sliderAccelerationConstantValue: ObservableNumber;
	private readonly toggleIsManual: ObservableBoolean;
	private readonly sliderMaxManualSpeedValue: ObservableNumber;

	private static readonly SELECTED_TRAIN_TEXT: UIRawMessage = { translate: "gui.mts.selected_vehicle" };
	private static readonly MAX_TRAINS_TEXT: UIRawMessage = { translate: "gui.mts.max_vehicles" };
	private static readonly ACCELERATION_CONSTANT_TEXT: UIRawMessage = { translate: "gui.mts.acceleration" };
	private static readonly MANUAL_TO_AUTOMATIC_TIME: UIRawMessage = { translate: "gui.mts.manual_to_automatic_time" };
	private static readonly MAX_MANUAL_SPEED: UIRawMessage = { translate: "gui.mts.max_manual_speed" };
	private static readonly MAX_TRAINS_TEXT_LENGTH = 3;
	private static readonly SLIDER_SCALE = 1000;
	private static readonly ACCELERATION_UNIT_CONVERSION_1 = 20 * 20; // m/tick^2 to m/s^2
	private static readonly ACCELERATION_UNIT_CONVERSION_2 = SidingScreen.ACCELERATION_UNIT_CONVERSION_1 * 3.6; // m/tick^2 to km/h/s

	public constructor(siding: Siding, transportMode: TransportMode, dashboardScreen: TrainDashboardClient) {
		super(siding, transportMode, dashboardScreen, SidingScreen.MANUAL_TO_AUTOMATIC_TIME, "gui.mts.siding_number");
		this.transportMode = transportMode;

		this.customForm.label(SidingScreen.SELECTED_TRAIN_TEXT);
		this.customForm.button(this.buttonSelectTrainLabel, () => this.onSelectingTrain());
		this.updateButtonSelectedTrainLabel();

		this.textFieldMaxTrains = new BetterTextField(SidingScreen.MAX_TRAINS_TEXT, TextFieldFilter.POSITIVE_INTEGER, this.savedRailBase.getUnlimitedTrains() ? "" : String(this.savedRailBase.getMaxTrains() + 1), SidingScreen.MAX_TRAINS_TEXT_LENGTH, text => {
			this.toggleUnlimitedTrains!.setData(text == "");
			if (text != "1") {
				this.toggleIsManual.setData(false);
			}
		});

		const accelerationConstant = Math.round((this.savedRailBase.getAccelerationConstant() - Train.MIN_ACCELERATION) * SidingScreen.SLIDER_SCALE);
		this.sliderAccelerationConstantValue = new ObservableNumber(accelerationConstant, { clientWritable: true });
		const sliderAccelerationConstantLabel = new ObservableString(SidingScreen.getAccelerationSliderMessage(accelerationConstant));
		this.sliderAccelerationConstantValue.subscribe(newValue => sliderAccelerationConstantLabel.setData(SidingScreen.getAccelerationSliderMessage(newValue)));

		this.toggleIsManual = new ObservableBoolean(this.savedRailBase.getIsManual(), { clientWritable: true });
		this.toggleIsManual.subscribe(toggled => {
			if (toggled && this.textFieldMaxTrains!.getValue() != "1") {
				this.textFieldMaxTrains!.setValue("1");
			}
		});

		const maxManualSpeed = this.savedRailBase.getMaxManualSpeed();
		this.sliderMaxManualSpeedValue = new ObservableNumber(maxManualSpeed, { clientWritable: true });
		const sliderMaxManualSpeedLabel = new ObservableUIRawMessage(SidingScreen.getSpeedSliderMessage(maxManualSpeed));
		this.sliderMaxManualSpeedValue.subscribe(newValue => sliderMaxManualSpeedLabel.setData(SidingScreen.getSpeedSliderMessage(newValue)));

		this.toggleUnlimitedTrains = new ObservableBoolean(this.savedRailBase.getUnlimitedTrains(), { clientWritable: true });
		this.toggleUnlimitedTrains.subscribe(toggled => {
			if (toggled) {
				this.toggleIsManual.setData(false);
			}
			if (toggled && this.textFieldMaxTrains!.getValue() != "") {
				this.textFieldMaxTrains!.setValue("");
			} else if (!toggled && this.textFieldMaxTrains!.getValue() == "") {
				this.textFieldMaxTrains!.setValue("1");
			}
		});

		if (this.showScheduleControls) {
			this.textFieldMaxTrains.addToCustomForm(this.customForm);
			this.customForm.slider(SidingScreen.ACCELERATION_CONSTANT_TEXT, this.sliderAccelerationConstantValue, 0, Math.round((Train.MAX_ACCELERATION - Train.MIN_ACCELERATION) * SidingScreen.SLIDER_SCALE), {
				description: sliderAccelerationConstantLabel,
				step: 1
			})
			this.customForm.toggle({ translate: "gui.mts.is_manual" }, this.toggleIsManual);
			this.customForm.slider(SidingScreen.MAX_MANUAL_SPEED, this.sliderMaxManualSpeedValue, 0, RailType.DIAMOND.ordinal(), {
				description: sliderMaxManualSpeedLabel
			});
			// this.customForm.toggle({ translate: "gui.mts.unlimited_vehicles" }, this.toggleUnlimitedTrains);
		}

		this.oldAcceleration = this.savedRailBase.getAccelerationConstant();
		this.oldIsManual = this.savedRailBase.getIsManual();
		this.oldMaxManualSpeed = this.savedRailBase.getMaxManualSpeed();
		this.oldDwellTime = this.savedRailBase.getDwellTime();
	}

	public override onClose(isServerClosed: boolean, isClientClosed: boolean, isUserBusy: boolean): void {
		if (!isServerClosed) {
			const maxTrains = Math.max(0, parseInt(this.textFieldMaxTrains.getValue()) - 1);
			const accelerationConstant = RailwayData.round(Mth.clamp(this.sliderAccelerationConstantValue.getData() / SidingScreen.SLIDER_SCALE + Train.MIN_ACCELERATION, Train.MIN_ACCELERATION, Train.MAX_ACCELERATION), 3);
			const isManual = this.toggleIsManual.getData();
			const maxManualSpeed = this.sliderMaxManualSpeedValue.getData();
			const minutes = this.sliderDwellTimeMin.getData();
			const second = this.sliderDwellTimeSec.getData() / 2;
			const dwellTime = (second + minutes * SavedRailScreenBase.SECONDS_PER_MINUTE) * 2;
			this.savedRailBase.setUnlimitedTrains(this.toggleUnlimitedTrains.getData(), maxTrains, isManual, maxManualSpeed, accelerationConstant, dwellTime, this.oldAcceleration != accelerationConstant || this.oldIsManual != isManual || this.oldMaxManualSpeed != maxManualSpeed || this.oldDwellTime != dwellTime);

			system.run(() => (this.dashboardScreen as any).showSitesPage());
		}
	}

	private onSelectingTrain(): void {
		this.customForm.close();
		new SidingScreen.SelectTrainScreen(this).show();
	}

	private updateButtonSelectedTrainLabel(): void {
		this.buttonSelectTrainLabel.setData({ translate: TrainRegistry.getTrainProperties(this.savedRailBase.getTrainId()).name });
	}

	private static getAccelerationSliderMessage(value: number): string {
		const valueMeterPerTickSquared = value / SidingScreen.SLIDER_SCALE + Train.MIN_ACCELERATION;
		return `${RailwayData.round(valueMeterPerTickSquared * SidingScreen.ACCELERATION_UNIT_CONVERSION_1, 1)} m/s² (${RailwayData.round(valueMeterPerTickSquared * SidingScreen.ACCELERATION_UNIT_CONVERSION_2, 1)} km/h/s)`;
	}

	private static getSpeedSliderMessage(value: number): UIRawMessage {
		const railType = Train.convertMaxManualSpeed(value);
		return railType == undefined ? { translate: "gui.mts.unlimited" } : { text: `${railType.speedLimit} km/h` };
	}


	private static readonly TrainForList = class extends NameColorDataBase {

		public readonly trainId: string;
		public readonly trainProperties: TrainProperties;
		public readonly isAvailable: boolean;

		public static readonly ICON_WARNING = "⚠ "

		constructor(savedRailBase: Siding, trainId: string, trainProperties: TrainProperties) {
			super();
			this.trainId = trainId;
			this.trainProperties = trainProperties;
			this.isAvailable = savedRailBase.isValidVehicle(TrainType.getSpacing(trainProperties.baseTrainType));
		}

		override hasTransportMode(): boolean {
			return false;
		}
	}

	private static readonly DescriptionScreen = class {

		private readonly customForm: CustomForm;
		private readonly trainForList: InstanceType<typeof SidingScreen.TrainForList>;
		private readonly selectTrainScreen: InstanceType<typeof SidingScreen.SelectTrainScreen>;

		constructor(selectTrainScreen: InstanceType<typeof SidingScreen.SelectTrainScreen>, trainForList: InstanceType<typeof SidingScreen.TrainForList>) {
			this.selectTrainScreen = selectTrainScreen;
			this.trainForList = trainForList;
			const properties = trainForList.trainProperties
			this.customForm = new CustomForm(selectTrainScreen.sidingScreen.dashboardScreen.player, "").closeButton();

			this.customForm.label(properties.name).spacer().spacer();

			const savedRailBase = selectTrainScreen.sidingScreen.savedRailBase;
			const spacing = TrainType.getSpacing(properties.baseTrainType);
			const cars = Math.floor(savedRailBase.railLength / spacing);
			this.customForm.label({ translate: "gui.mts.vehicle_length", with: [String(spacing - 1)] }).spacer();
			this.customForm.label({ translate: "gui.mts.cars_to_spawn", with: [String((cars == 0 ? SidingScreen.TrainForList.ICON_WARNING : "") + Math.min(cars, savedRailBase.transportMode.maxLength))] }).spacer();

			if (properties.description != null) {
				this.customForm.divider().label(properties.description).spacer();
			}
			this.customForm.button({ translate: "options.dev_apply" }, () => {
				const baseTrainType = this.trainForList.trainProperties.baseTrainType;
				const savedRailBase = this.selectTrainScreen.sidingScreen.savedRailBase;

				if (this.trainForList.isAvailable) {
					savedRailBase.setTrainDelails(this.trainForList.trainId, baseTrainType, false);
					savedRailBase.clearTrains();
					this.customForm.close();
				}
			});
		}

		public show(): void {
			this.customForm.show().then(onfulfilled => {
				if (onfulfilled == "ClientClosed" || !this.trainForList.isAvailable) {
					system.run(() => this.selectTrainScreen.show());
				}
			});
		}
	}

	private static readonly SelectTrainScreen = class {
		
		readonly customForm: CustomForm;
		readonly sidingScreen: SidingScreen;

		constructor(sidingScreen: SidingScreen) {
			this.sidingScreen = sidingScreen;
			this.customForm = new CustomForm(sidingScreen.dashboardScreen.player, "").closeButton();

			const trainButtonVisibles: ObservableBoolean[] = []
			const trainsForListUnavailable: Array<InstanceType<typeof SidingScreen.TrainForList>> = [];
			let trainsForListTemp = new ArrayList<InstanceType<typeof SidingScreen.TrainForList>>();

			const filterString = new ObservableString("", { clientWritable: true });
			filterString.subscribe(newValue => {
				for (let i = 0; i < trainsForListTemp.length; i++) {
					trainButtonVisibles[i].setData(trainsForListTemp[i].name.toLowerCase().includes(newValue.toLowerCase()));
				}
			});
			this.customForm.textField({ translate: "gui.mts.search" }, filterString).spacer();

			TrainRegistry.forEach(sidingScreen.transportMode, (id, trainProperties) => {
				const trainForList = new SidingScreen.TrainForList(sidingScreen.savedRailBase, id, trainProperties!);
				(trainForList.isAvailable ? trainsForListTemp : trainsForListUnavailable).push(trainForList);
			})

			trainsForListTemp.push(...trainsForListUnavailable);
			trainsForListTemp = trainsForListTemp.sort()

			trainsForListTemp.forEach((data, i) => {
				const visible = new ObservableBoolean(true);
				trainButtonVisibles.push(visible);

				this.customForm.button({
					rawtext: [
						{
							text: data.isAvailable ? "" : SidingScreen.TrainForList.ICON_WARNING
						},
						{
							translate: data.name
						}
					]
				}, () => {
					this.customForm.close();
					system.run(() => new SidingScreen.DescriptionScreen(this, data).show());
				}, { visible });
			});
		}

		public show(): void {
			this.customForm.show().then(() => system.run(() => this.sidingScreen.show()));
		}
	}
}