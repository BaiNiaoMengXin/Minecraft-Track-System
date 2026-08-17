import { Depot } from "data/Depot";
import { EditNameColorScreenBase } from "./EditNameColorScreenBase";
import { Siding } from "data/Siding";
import { CustomForm, ObservableBoolean, ObservableNumber, ObservableString, ObservableUIRawMessage, UIRawMessage } from "@minecraft/server-ui";
import { TransportMode } from "data/TransportMode";
import { DashboardScreen } from "./DashboardScreen";
import { MTS } from "MTS";
import { IGui } from "data/IGui";
import { RailwayData } from "data/RailwayData";
import { BetterTextField, TextFieldFilter } from "./BetterTextField";
import { system } from "@minecraft/server";
import { TimeUnit } from "data/Base";
import { DeleteConfirmationScreen } from "./DeleteConfirmationScreen";
import { EditAreaScreenBase } from "./EditAreaScreenBase";
import { DashboardListSelectorScreen } from "./DashboardListSelectorScreen";

export class EditDepotScreen extends EditAreaScreenBase<Depot> {

	private readonly showScheduleControls: boolean;
	private readonly showCruisingAltitude: boolean;
	private readonly sidingsInDepot: Map<number, Siding>;

	private runIntervalId: number = -1;

	private readonly nextDepartureLabel: ObservableUIRawMessage = new ObservableUIRawMessage({});
	private readonly buttonGenerateRouteDisabled: ObservableBoolean;
	private readonly toggleRepeatIndefinitely: ObservableBoolean;
	private readonly toggleRepeatIndefinitelyVisible: ObservableBoolean;
	private readonly textFieldCruisingAltitude: BetterTextField;

	private static readonly cruisingAltitudeText: UIRawMessage = { translate: "gui.mts.cruising_altitude" };

	public constructor(depot: Depot, transportMode: TransportMode, dashboardScreen: DashboardScreen, onCloseCallback: () => void) {
		super(depot, dashboardScreen, "gui.mts.depot_name", onCloseCallback);

		this.sidingsInDepot = MTS.railwayData.dataCache.requestDepotIdToSidings(depot.id);

		this.customForm.label({ translate: "gui.mts.sidings_in_depot", with: [String(this.sidingsInDepot.size)] }).spacer();
		this.customForm.label(this.nextDepartureLabel).spacer();

		this.showScheduleControls = !transportMode.continuousMovement;
		this.showCruisingAltitude = transportMode == TransportMode.AIRPLANE;

		this.customForm.button({ translate: "gui.mts.edit_instructions" }, () => {
			this.saveData();
			this.customForm.close();

			system.run(() => {
				const routes = Array.from(MTS.railwayData.dataCache.routes).filter(v => v.transportMode == transportMode).sort((a, b) => a.compareTo(b));
				new DashboardListSelectorScreen(dashboardScreen.player, () => {
					system.run(() => this.show());
				}, routes, this.data.routeIds, false, true).show();
			});
		}).spacer();

		const successfulSegmentsText = new ObservableUIRawMessage({});

		this.buttonGenerateRouteDisabled = new ObservableBoolean(false);
		this.customForm.button({ translate: "gui.mts.refresh_path" }, () => {
			this.saveData();
			this.buttonGenerateRouteDisabled.setData(true);
			MTS.railwayData.railwayDataPathGenerationMoudle.generatePath(this.data.id, successfulSegments => {
				successfulSegmentsText.setData(this.getSuccessfulSegmentsText(successfulSegments));

				this.buttonGenerateRouteDisabled.setData(false);
			})
		}, { disabled: this.buttonGenerateRouteDisabled }).label(successfulSegmentsText).spacer().spacer();

		this.toggleRepeatIndefinitely = new ObservableBoolean(this.data.repeatInfinitely, { clientWritable: true });
		this.toggleRepeatIndefinitelyVisible = new ObservableBoolean(false);
		this.toggleRepeatIndefinitely.subscribe(() => {
			this.saveData();
			MTS.railwayData.railwayDataPathGenerationMoudle.generatePath(this.data.id, successfulSegments => {
				successfulSegmentsText.setData(this.getSuccessfulSegmentsText(successfulSegments));
			})
		});

		if (this.showScheduleControls) {
			this.customForm.button({ translate: "gui.mts.clear_vehicles" }, () => {
				for (const siding of this.sidingsInDepot.values()) {
					siding.clearTrains();
				}
			});
			this.customForm.toggle({ translate: "gui.mts.repeat_indefinitely" }, this.toggleRepeatIndefinitely, { visible: this.toggleRepeatIndefinitelyVisible });

			this.customForm.button({ translate: "gui.mts.edit_time" }, () => {
				this.customForm.close();
				system.run(() => new EditDepotScreen.EditDepartureScreen(this).show());
			});
		}

		this.textFieldCruisingAltitude = new BetterTextField(EditDepotScreen.cruisingAltitudeText, TextFieldFilter.INTEGER, String(this.data.cruisingAltitude), 5);
		if (this.showCruisingAltitude) {
			this.textFieldCruisingAltitude.addToCustomForm(this.customForm);
		}

		this.tick();
	}

	public tick(): void {
		if (this.data.routeIds.isEmpty()) {
			this.toggleRepeatIndefinitelyVisible!.setData(false);
		} else {
			const firstRoute = MTS.railwayData.dataCache.routeIdMap.get(this.data.routeIds[0]);
			const lastRoute = MTS.railwayData.dataCache.routeIdMap.get(this.data.routeIds[this.data.routeIds.length - 1]);
			this.toggleRepeatIndefinitelyVisible!.setData(firstRoute != null && lastRoute != null && !firstRoute.platformIds.isEmpty() && !lastRoute.platformIds.isEmpty() && firstRoute.getFirstPlatformId() == lastRoute.getLastPlatformId());
		}

		const nextDepartureMillis = this.data.getMillisUntilDeploy(1);
		if (nextDepartureMillis >= 0) {
			const hour = String(TimeUnit.MILLISECONDS.toHours(nextDepartureMillis)).padStart(2, "0");
			const minute = String(TimeUnit.MILLISECONDS.toMinutes(nextDepartureMillis) % 60).padStart(2, "0");
			const second = String(TimeUnit.MILLISECONDS.toSeconds(nextDepartureMillis) % 60).padStart(2, "0");
			this.nextDepartureLabel.setData({ translate: "gui.mts.next_departure", with: [(`${hour}:${minute}:${second}`)] });
		} else {
			this.nextDepartureLabel.setData({ translate: "gui.mts.next_departure_none" });
		}
	}

	public override show(): void {
		this.runIntervalId = system.runInterval(() => this.tick(), 10);
		super.show();
	}

	protected override onClose(): void {
		system.clearRun(this.runIntervalId);
		this.runIntervalId = -1;
	}

	protected saveData(): void {
		super.saveData();
		this.data.repeatInfinitely = this.toggleRepeatIndefinitelyVisible.getData() && this.toggleRepeatIndefinitely.getData();
		this.data.cruisingAltitude = parseInt(this.textFieldCruisingAltitude.getValue());
	}

	private getSuccessfulSegmentsText(successfulSegments: number): UIRawMessage {
		const stationNames: Array<UIRawMessage> = [];
		const routeNames: Array<UIRawMessage> = [];
		const depotName = IGui.textOrUntitled(IGui.formatStationName(this.data.name));

		if (successfulSegments == 1) {
			RailwayData.useRoutesAndStationsFromIndex(0, this.data.routeIds, MTS.railwayData.dataCache, (currentStationIndex, thisRoute, nextRoute, thisStation, nextStation, lastStation) => {
				stationNames.push(IGui.textOrUntitled(thisStation == null ? "" : IGui.formatStationName(thisStation.name)));
				routeNames.push(IGui.textOrUntitled(thisRoute == null ? "" : IGui.formatStationName(thisRoute.name)));
			});
			stationNames.push({ text: "-" });
			routeNames.push({ text: "-" });

			return {
				translate: "gui.mts.path_not_found_between",
				with: {
					rawtext: [
						routeNames[0],
						depotName,
						stationNames[0]
					]
				}
			};
		} else {
			let sum = 0;
			for (let i = 0; i < this.data.routeIds.length; i++) {
				const thisRoute = MTS.railwayData.dataCache.routeIdMap.get(this.data.routeIds[i]);
				const nextRoute = i < this.data.routeIds.length - 1 ? MTS.railwayData.dataCache.routeIdMap.get(this.data.routeIds[i + 1]) : undefined;
				if (thisRoute != null) {
					sum += thisRoute.platformIds.length;
					if (!thisRoute.platformIds.isEmpty() && nextRoute != null && !nextRoute.platformIds.isEmpty() && thisRoute.getLastPlatformId() == nextRoute.getFirstPlatformId()) {
						sum--;
					}
				}
			}

			if (successfulSegments >= sum + 2) {
				return {
					translate: "gui.mts.path_found"
				};
			} else {
				RailwayData.useRoutesAndStationsFromIndex(successfulSegments - 2, this.data.routeIds, MTS.railwayData.dataCache, (currentStationIndex, thisRoute, nextRoute, thisStation, nextStation, lastStation) => {
					stationNames.push(IGui.textOrUntitled(thisStation == null ? "" : IGui.formatStationName(thisStation.name)));
					if (nextStation == null) {
						RailwayData.useRoutesAndStationsFromIndex(successfulSegments - 1, (this.data as Depot).routeIds, MTS.railwayData.dataCache, (currentStationIndex1, thisRoute1, nextRoute1, thisStation1, nextStation1, lastStation1) => stationNames.push(IGui.textOrUntitled(thisStation1 == null ? "" : IGui.formatStationName(thisStation1.name))));
					} else {
						stationNames.push(IGui.textOrUntitled(IGui.formatStationName(nextStation.name)));
					}
					routeNames.push(IGui.textOrUntitled(IGui.formatStationName(thisRoute.name)));
				});
				stationNames.push({ text: "-" });
				stationNames.push({ text: "-" });
				routeNames.push({ text: "-" });

				if (successfulSegments < sum + 1) {
					return {
						translate: "gui.mts.path_not_found_between",
						with: {
							rawtext: [
								routeNames[0],
								stationNames[0],
								stationNames[1]
							]
						}
					};
				} else {
					return {
						translate: "gui.mts.path_not_found_between",
						with: {
							rawtext: [
								routeNames[0],
								stationNames[0],
								depotName
							]
						}
					};
				}
			}
		}
	}

	private static readonly EditDepartureScreen = class {

		private readonly editDepotScreen: EditDepotScreen;

		private customForm!: CustomForm;

		private readonly buttonUseRealTimeLabel = new ObservableUIRawMessage({});
		private readonly notUseRealTime = new ObservableBoolean(true);
		private readonly sliderValues = new Array<ObservableNumber>(Depot.HOURS_IN_DAY);
		private readonly sliderLabels = new Array<ObservableUIRawMessage>(Depot.HOURS_IN_DAY);
		private readonly textFieldDeparture: BetterTextField;
		private readonly buttonAddDepartureDisabled = new ObservableBoolean(false);


		private static readonly MAX_TRAINS_PER_HOUR = 5;
		private static readonly SECONDS_PER_MC_HOUR = Depot.TICKS_PER_HOUR / 20;

		constructor(editDepotScreen: EditDepotScreen) {
			this.editDepotScreen = editDepotScreen;
			this.textFieldDeparture = new BetterTextField("", /[^\d:+* ]/g, "07:10:00 + 10 * 00:03:00", 25, text => {
				this.buttonAddDepartureDisabled.setData(!this.checkDeparture(text, false, false));
			});

			this.regenerate();
		}

		private regenerate() {
			this.customForm = new CustomForm(this.editDepotScreen.dashboardScreen.player, "").closeButton();

			this.toggleRealTime();

			this.customForm.button(this.buttonUseRealTimeLabel, () => {
				this.editDepotScreen.data.useRealTime = !this.editDepotScreen.data.useRealTime;
				this.toggleRealTime();
				this.editDepotScreen.saveData();
			});

			this.customForm.button({ translate: "gui.mts.reset_sign" }, () => {
				for (let i = 0; i < Depot.HOURS_IN_DAY; i++) {
					this.sliderValues[i].setData(0);
				}
				this.editDepotScreen.data.departures.length = 0;
				this.editDepotScreen.saveData();

				if (!this.notUseRealTime.getData()) {
					this.customForm.close();
					this.regenerate();
					system.run(() => this.show());
				}
			});


			const syncAllSlider = new ObservableBoolean(false, { clientWritable: true });
			this.customForm.toggle({ translate: "gui.mts.sync" }, syncAllSlider, { visible: this.notUseRealTime });
			for (let i = 0; i < Depot.HOURS_IN_DAY; i++) {
				const currentIndex = i;
				const frequency = this.editDepotScreen.data.getFrequency(i)
				this.sliderValues[i] = new ObservableNumber(frequency, { clientWritable: true });
				this.sliderLabels[i] = new ObservableUIRawMessage(EditDepotScreen.EditDepartureScreen.getSliderText(frequency, i));
				this.customForm.slider(this.sliderLabels[i], this.sliderValues[i], 0, EditDepotScreen.EditDepartureScreen.MAX_TRAINS_PER_HOUR * 2, { step: 1, visible: this.notUseRealTime });
				this.sliderValues[i].subscribe(newValue => {
					if (syncAllSlider.getData()) {
						for (let j = 0; j < Depot.HOURS_IN_DAY; j++) {
							if (j != currentIndex) {
								this.sliderValues[j].setData(newValue);
								this.sliderLabels[currentIndex].setData(EditDepotScreen.EditDepartureScreen.getSliderText(newValue, j));
							}
							this.editDepotScreen.data.setFrequency(this.sliderValues[j].getData(), j);
						}
					} else {
						this.sliderLabels[currentIndex].setData(EditDepotScreen.EditDepartureScreen.getSliderText(newValue, currentIndex));
						this.editDepotScreen.data.setFrequency(this.sliderValues[currentIndex].getData(), currentIndex);
					}
				});
			}


			this.textFieldDeparture.addToCustomForm(this.customForm);
			this.customForm.button({ translate: "options.dev_addLabel" }, () => {
				this.checkDeparture(this.textFieldDeparture.getValue(), true, false);
				this.editDepotScreen.saveData();

				this.customForm.close();
				this.regenerate();
				system.run(() => this.show());
			}, { disabled: this.buttonAddDepartureDisabled, visible: this.textFieldDeparture._visible });


			const departureData: string[] = [];
			const offset = new Date().getTime() / Depot.MILLISECONDS_PER_DAY * Depot.MILLISECONDS_PER_DAY;
			const getComparingTime = (date: Date) => {
				const hour = date.getHours();
				const minute = date.getMinutes();
				const second = date.getSeconds();
				return hour * 3600 + minute * 60 + second;
			}
			this.editDepotScreen.data.departures.map(departure => {
				const date = new Date();
				date.setTime(departure + offset);
				return date;
			}).sort((a, b) => getComparingTime(a) - getComparingTime(b)).forEach(date => {
				const hour = String(date.getHours()).padStart(2, "0");
				const minute = String(date.getMinutes()).padStart(2, "0");
				const second = String(date.getSeconds()).padStart(2, "0");
				departureData.push(`${hour}:${minute}:${second}`);
			});

			for (let i = 0; i < departureData.length; i++) {
				const currentIndex = i;
				this.customForm.button(departureData[i], () => {
					new DeleteConfirmationScreen(this.editDepotScreen.dashboardScreen.player, isDelete => {
						if (isDelete) {
							this.checkDeparture(departureData[currentIndex], false, true);
							this.editDepotScreen.saveData();

							this.regenerate();
						}
						system.run(() => this.show());
					}, departureData[i]).show();
				}, { visible: this.textFieldDeparture._visible });
			}
		}

		public show(): void {
			this.customForm.show().then(onfulfilled => {
				if (onfulfilled == "ClientClosed") {
					system.run(() => this.editDepotScreen.show());
				}
			});
		}

		private toggleRealTime(): void {
			this.buttonUseRealTimeLabel.setData({ translate: this.editDepotScreen.data.useRealTime ? "gui.mts.schedule_mode_real_time_on" : "gui.mts.schedule_mode_real_time_off" });
			this.textFieldDeparture.setVisible(this.editDepotScreen.data.useRealTime);
			this.notUseRealTime.setData(!this.editDepotScreen.data.useRealTime);
		}

		private checkDeparture(text: string, addToList: boolean, removeFromList: boolean) {
			try {
				const depot = this.editDepotScreen.data;

				const departureSplit = text.replace(" ", "").split(/\+/);
				const timeSplit1 = departureSplit[0].split(":");
				const date = new Date();
				date.setHours(parseInt(timeSplit1[0]) % 24);
				date.setMinutes(parseInt(timeSplit1[1]) % 60);
				date.setSeconds(parseInt(timeSplit1[2]) % 60);
				date.setMilliseconds(0);
				const departure = date.getTime() % Depot.MILLISECONDS_PER_DAY;
				let multiple: number;
				let interval: number;

				if (departureSplit.length > 1) {
					const intervalSplit = departureSplit[1].split(/\*/);
					multiple = parseInt(intervalSplit[0]) + 1;
					const timeSplit2 = intervalSplit[1].split(":");
					interval = (parseInt(timeSplit2[0]) * 3600 + parseInt(timeSplit2[1]) * 60 + parseInt(timeSplit2[2])) * 1000;
				} else {
					multiple = 1;
					interval = 0;
				}

				if (addToList || removeFromList) {
					for (let i = 0; i < multiple; i++) {
						const rawDeparture = (departure + i * interval) % Depot.MILLISECONDS_PER_DAY;
						if (addToList) {
							if (!depot.departures.includes(rawDeparture)) {
								depot.departures.push(rawDeparture);
							}
						} else {
							const index = depot.departures.indexOf(rawDeparture);
							if (index != -1) {
								depot.departures.splice(index, 1);
							}
						}
					}
				}

				return true;
			} catch (e) {
				return false
			}
		}


		private static getSliderText(value: number, hourIndex: number): UIRawMessage {
			const text: UIRawMessage = {
				rawtext: [
					{
						text: this.getTimeString(hourIndex) + "    " + String(value / Depot.TRAIN_FREQUENCY_MULTIPLIER)
					},
					{
						translate: "gui.mts.tph"
					}
				]
			};
			if (value != 0) {
				text.rawtext!.push(
					{
						text: " (" + RailwayData.round(Depot.TRAIN_FREQUENCY_MULTIPLIER * EditDepotScreen.EditDepartureScreen.SECONDS_PER_MC_HOUR / value, 1)
					},
					{
						translate: "gui.mts.s"
					},
					{
						text: ")"
					}
				)
			}
			return text;
		}

		private static getTimeString(hour: number): string {
			const hourString = String(hour).padStart(2, "0");
			return `${hourString}:00-${hourString}:59`;
		}
	}
}
