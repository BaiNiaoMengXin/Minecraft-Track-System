import { Station } from "data/Station";
import { EditAreaScreenBase } from "./EditAreaScreenBase";
import { ObservableBoolean, UIRawMessage } from "@minecraft/server-ui";
import { BetterTextField, TextFieldFilter } from "./BetterTextField";
import { DashboardScreen } from "./DashboardScreen";
import { NameColorDataBase } from "data/NameColorDataBase";

export class EditStationScreen extends EditAreaScreenBase<Station> {

	// private editingExit!: string | null;
	// private editingDestinationIndex: number;
	// private clickDelay: number;

	// private readonly textFieldZone: BetterTextField;
	// private readonly textFieldExitParentLetter: BetterTextField;
	// private readonly textFieldExitParentNumber: BetterTextField;
	// private readonly textFieldExitDestination: BetterTextField;

	// private readonly buttonAddExitParentVisible = new ObservableBoolean(true);
	// private readonly buttonDoneExitParentVisible = new ObservableBoolean(true);
	// private readonly buttonAddExitDestinationVisible = new ObservableBoolean(true);
	// private readonly buttonDoneExitDestinationVisible = new ObservableBoolean(true);

	// private final DashboardList exitParentList;
	// private final DashboardList exitDestinationList;

	private static readonly STATION_ZONE_TEXT: UIRawMessage = { translate: "gui.mtr.zone" };
	private static readonly EXIT_PARENTS_TEXT: UIRawMessage = { translate: "gui.mtr.exit_parents" };
	private static readonly EXIT_DESTINATIONS_TEXT: UIRawMessage = { translate: "gui.mtr.exit_destinations" };

	public constructor(station: Station, dashboardScreen: DashboardScreen, onCloseCallback: () => void) {
		super(station, dashboardScreen, "gui.mts.station_name", onCloseCallback);
		// this.textFieldZone = new BetterTextField(EditStationScreen.STATION_ZONE_TEXT, TextFieldFilter.INTEGER, String(this.data.zone), 6);
		// this.textFieldExitParentLetter = new BetterTextField(TextFieldFilter.LETTER, "A", 1);
		// this.textFieldExitParentNumber = new BetterTextField(TextFieldFilter.POSITIVE_INTEGER, "1", 2);
		// this.textFieldExitDestination = new BetterTextField("");

		// this.customForm.button({ translate: "gui.mtr.add_exit" }, () => this.checkClickDelay(() => changeEditingExit("", -1)));
		// this.customForm.button({ translate: "gui.done" }, () => this.checkClickDelay(this::onDoneExitParent));
		// this.customForm.button({ translate: "gui.mtr.add_exit_destination" }, () => this.checkClickDelay(() => changeEditingExit(editingExit, station.exits.containsKey(editingExit) ? station.exits.get(editingExit).size() : -1)));
		// this.customForm.button({ translate: "gui.done" }, () => this.checkClickDelay(this::onDoneExitDestination));

		// exitParentList = new DashboardList(null, null, this::onEditExitParent, null, null, this::onDeleteExitParent, null, () => ClientData.EXIT_PARENTS_SEARCH, text => ClientData.EXIT_PARENTS_SEARCH = text);
		// exitDestinationList = new DashboardList(null, null, this::onEditExitDestination, this::onSortExitDestination, null, this::onDeleteExitDestination, this::getExitDestinationList, () => ClientData.EXIT_DESTINATIONS_SEARCH, text => ClientData.EXIT_DESTINATIONS_SEARCH = text);

		// this.changeEditingExit(null, -1);
	}
/*
	@Override
	public void tick() {
		super.tick();

		if (clickDelay > 0) {
			clickDelay--;
		}

		final List<DataConverter> exitParents = data.exits.keySet().stream().sorted().map(value => {
			final List<String> destinations = data.exits.get(value);
			final String additional = destinations.size() > 1 ? "(+" + (destinations.size() - 1) + ")" : "";
			return new DataConverter(destinations.size() > 0 ? value + "|" + destinations.get(0) + "|" + additional : value, 0);
		}).collect(Collectors.toList());
		exitParentList.setData(exitParents, false, false, true, false, false, true);

		final List<DataConverter> exitDestinations = parentExists() ? data.exits.get(editingExit).stream().map(value => new DataConverter(value, 0)).collect(Collectors.toList()) : new ArrayList<>();
		exitDestinationList.setData(exitDestinations, false, false, true, true, false, true);
	}
	@Override
	public void render(PoseStack matrices, int mouseX, int mouseY, float delta) {
		try {
			drawCenteredString(matrices, font, stationZoneText, width / 8 * 7, TEXT_PADDING, ARGB_WHITE);
			drawCenteredString(matrices, font, exitParentsText, width / 4, EXIT_PANELS_START - SQUARE_SIZE + TEXT_PADDING, ARGB_WHITE);
			if (parentExists()) {
				drawCenteredString(matrices, font, exitDestinationsText, 3 * width / 4, EXIT_PANELS_START - SQUARE_SIZE + TEXT_PADDING, ARGB_WHITE);
			}
	}

	protected override saveData(): void {
		super.saveData();
		this.data.zone = parseInt(this.textFieldZone.getValue());
	}

	private changeEditingExit(editingExit: string | null, editingDestinationIndex: number) {
		this.editingExit = editingExit;
		this.editingDestinationIndex = this.parentExists() ? editingDestinationIndex : -1;

		if (editingExit != null) {
			this.textFieldExitParentLetter.setValue(editingExit.toUpperCase().replaceAll(/[^A-Z]/g, ""));
			this.textFieldExitParentNumber.setValue(editingExit.replaceAll(/\D/g, ""));
		}
		if (editingDestinationIndex >= 0 && editingDestinationIndex < this.data.exits.get(editingExit!)!.length) {
			this.textFieldExitDestination.setValue(this.data.exits.get(editingExit!)![editingDestinationIndex]);
		} else {
			this.textFieldExitDestination.setValue("");
		}

		this.textFieldExitParentLetter.setVisible(editingExit != null);
		this.textFieldExitParentNumber.setVisible(editingExit != null);
		this.textFieldExitDestination.setVisible(editingDestinationIndex >= 0);
		this.buttonAddExitParentVisible.setData(editingExit == null);
		this.buttonDoneExitParentVisible.setData(editingExit != null);
		this.buttonAddExitDestinationVisible.setData(this.parentExists() && editingDestinationIndex < 0);
		this.buttonDoneExitDestinationVisible.setData(editingDestinationIndex >= 0);
		// exitDestinationList.x = parentExists() ? width / 2 : width;
		// exitParentList.height = height - EXIT_PANELS_START - (editingExit == null ? SQUARE_SIZE : SQUARE_SIZE * 2 + TEXT_FIELD_PADDING);
		// exitDestinationList.height = height - EXIT_PANELS_START - (editingDestinationIndex >= 0 ? SQUARE_SIZE * 2 + TEXT_FIELD_PADDING : SQUARE_SIZE);
	}

	private onDoneExitParent(): void {
		const parentLetter = this.textFieldExitParentLetter.getValue();
		const parentNumber = this.textFieldExitParentNumber.getValue();
		if (parentLetter != "" && parentNumber != "") {
			const exitParent = parentLetter + parseInt(parentNumber);
			this.data.setExitParent(this.editingExit!, exitParent);
		}
		this.changeEditingExit(null, -1);
	}

	private onDoneExitDestination(): void {
		const destination = this.textFieldExitDestination.getValue();
		if (this.parentExists() && this.editingDestinationIndex >= 0 && destination != "") {
			const destinations = this.data.exits.get(this.editingExit!)!;
			if (this.editingDestinationIndex < destinations.length) {
				destinations[this.editingDestinationIndex] = destination;
			} else {
				destinations.push(destination);
			}
		}
		this.changeEditingExit(this.editingExit, -1);
	}

	private onEditExitParent(listData: NameColorDataBase, index: number): void {
		this.changeEditingExit(EditStationScreen.formatExitName(listData.name), -1);
	}

	private onDeleteExitParent(listData: NameColorDataBase, index: number): void {
		this.data.exits.delete(EditStationScreen.formatExitName(listData.name));
		this.changeEditingExit(null, -1);
	}

	private onEditExitDestination(listData: NameColorDataBase, index: number): void {
		this.changeEditingExit(this.editingExit, index);
	}

	private onSortExitDestination(): void {
		this.changeEditingExit(this.editingExit, -1);
	}

	private onDeleteExitDestination(listData: NameColorDataBase, index: number): void {
		if (this.parentExists()) {
			const arr = this.data.exits.get(this.editingExit!)!;
			const index = arr.findIndex(v => v == listData.name);
			if (index != -1) {
				arr.splice(index, 1);
			}
		}
		this.changeEditingExit(this.editingExit, -1);
	}

	private getExitDestinationList(): Array<string> {
		return this.parentExists() ? this.data.exits.get(this.editingExit!)! : [];
	}

	private checkClickDelay(callback: () => void): void {
		if (this.clickDelay == 0) {
			callback();
			this.clickDelay = 10;
		}
	}

	private parentExists(): boolean {
		return this.editingExit != null && this.data.exits.has(this.editingExit);
	}

	private static formatExitName(text: string): string {
		return text.split(/\|/)[0];
	}
	*/
}