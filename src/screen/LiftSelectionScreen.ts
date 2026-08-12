import { Player, system } from "@minecraft/server";
import { ActionFormData, CustomForm, UIRawMessage } from "@minecraft/server-ui";
import { IGui } from "data/IGui";
import { Lift } from "data/Lift";
import { MTS } from "MTS";
import { BlockPos } from "util/math/BlockPos";

export class LiftSelectionScreen {

	private readonly actionFormData: ActionFormData;
	private readonly player: Player;

	private readonly floorLevels: Array<BlockPos> = [];
	private readonly floorDescriptions: Array<[string, string]> = [];
	private readonly lift: Lift;

	public constructor(player: Player, lift: Lift) {
		this.actionFormData = new ActionFormData();
		this.player = player;

		this.lift = lift;
		lift.floors.forEach(floor => {
			this.floorLevels.push(floor);
			this.floorDescriptions.push(MTS.railwayData.dataCache.requestLiftFloorText(floor));
		});

		for (let i = this.floorLevels.length - 1; i >= 0; i--) {
			const buttonText = this.floorDescriptions[i].join(" ");
			this.actionFormData.button(buttonText);
		}
	}

	public show() {
		this.actionFormData.show(this.player).then(onfulfilled => {
			if (onfulfilled.canceled) { return; }

			const index = this.floorLevels.length - 1 - onfulfilled.selection!;

			if (this.floorDescriptions[index][1] == "") {
				this.lift.pressButton(this.floorLevels[index].getY());
			} else {
				new LiftSelectionScreen.DescriptionsScreen(index, this.floorDescriptions[index], this).show();
			}
		});
	}

	private static readonly DescriptionsScreen = class {

		private readonly actionFormData: ActionFormData;
		private readonly liftSelectionScreen: LiftSelectionScreen;
		private readonly index: number;

		constructor(index: number, description: [string, string], liftSelectionScreen: LiftSelectionScreen) {
			this.liftSelectionScreen = liftSelectionScreen;
			this.index = index;
			this.actionFormData = new ActionFormData().title(IGui.textOrUntitled(IGui.formatStationName(description[0])));
			this.actionFormData.label(description[1]);
			this.actionFormData.button({ translate: "gui.ok" });
		}

		show() {
			this.actionFormData.show(this.liftSelectionScreen.player).then(onfulfilled => {
				if (onfulfilled.canceled) {
					this.liftSelectionScreen.show();
				}
				this.liftSelectionScreen.lift.pressButton(this.liftSelectionScreen.floorLevels[this.index].getY());
			});
		}
	}
}
