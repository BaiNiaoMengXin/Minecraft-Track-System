import { Player } from "@minecraft/server";
import { ActionFormData, CustomForm, ObservableBoolean, ObservableNumber, ObservableUIRawMessage } from "@minecraft/server-ui";
import { Lift } from "data/Lift";
import { LiftStyle } from "data/LiftBase";

export class LiftCustomizationScreen {

	private readonly actionFormData: ActionFormData;
	private readonly player: Player;

	private readonly lift: Lift;

	private static readonly MIN_DIMENSION = 2;
	private static readonly MAX_DIMENSION = 16;
	private static readonly MAX_OFFSET = 16;

	public constructor(player: Player, lift: Lift) {
		this.actionFormData = new ActionFormData();
		this.lift = lift;
		this.player = player;

		this.actionFormData.button((lift.liftHeight / 2 == LiftCustomizationScreen.MIN_DIMENSION ? "disabled:" : "") + "-");
		this.actionFormData.label({ translate: "tooltip.mts.rail_action_height", with: [String(lift.liftHeight / 2)] });
		this.actionFormData.button((lift.liftHeight / 2 == LiftCustomizationScreen.MAX_DIMENSION ? "disabled:" : "") + "+");

		this.actionFormData.button((lift.liftWidth == LiftCustomizationScreen.MIN_DIMENSION ? "disabled:" : "") + "-");
		this.actionFormData.label({ translate: "tooltip.mts.rail_action_width", with: [String(lift.liftWidth)] });
		this.actionFormData.button((lift.liftWidth == LiftCustomizationScreen.MAX_DIMENSION ? "disabled:" : "") + "+");

		this.actionFormData.button((lift.liftDepth == LiftCustomizationScreen.MIN_DIMENSION ? "disabled:" : "") + "-");
		this.actionFormData.label({ translate: "tooltip.mts.rail_action_depth", with: [String(lift.liftDepth)] });
		this.actionFormData.button((lift.liftDepth == LiftCustomizationScreen.MAX_DIMENSION ? "disabled:" : "") + "+");


		this.actionFormData.button((lift.liftOffsetX / 2 == -LiftCustomizationScreen.MAX_OFFSET ? "disabled:" : "") + "-");
		this.actionFormData.label({ translate: "gui.mts.offset_x", with: [String(lift.liftOffsetX / 2)] });
		this.actionFormData.button((lift.liftOffsetX / 2 == LiftCustomizationScreen.MAX_OFFSET ? "disabled:" : "") + "+");


		this.actionFormData.button((lift.liftOffsetY == -LiftCustomizationScreen.MAX_OFFSET ? "disabled:" : "") + "-");
		this.actionFormData.label({ translate: "gui.mts.offset_y", with: [String(lift.liftOffsetY)] });
		this.actionFormData.button((lift.liftOffsetY == LiftCustomizationScreen.MAX_OFFSET ? "disabled:" : "") + "+");

		this.actionFormData.button((lift.liftOffsetZ / 2 == -LiftCustomizationScreen.MAX_OFFSET ? "disabled:" : "") + "-");
		this.actionFormData.label({ translate: "gui.mts.offset_z", with: [String(lift.liftOffsetZ / 2)] });
		this.actionFormData.button((lift.liftOffsetZ / 2 == LiftCustomizationScreen.MAX_OFFSET ? "disabled:" : "") + "+");

		// fake checkbox
		this.actionFormData.button({ translate: "gui.mts.lift_is_double_sided" });

		this.actionFormData.button({
			translate: "gui.mts.lift_style",
			with: {
				rawtext: [
					{
						translate: "gui.mts.lift_style_" + this.lift.liftStyle.toString().toLowerCase()
					}
				]
			}
		});
		this.actionFormData.button({ translate: "gui.mts.rotate_anticlockwise" });
		this.actionFormData.button({ translate: "gui.mts.rotate_clockwise" });
	}

	public show(): void {
		this.actionFormData.show(this.player).then(onfulfilled => {
			if (onfulfilled.canceled) { return; }

			const selection = onfulfilled.selection!;
			switch (selection) {
				case 0:
					this.lift.liftHeight = Math.max(this.lift.liftHeight - 1, LiftCustomizationScreen.MIN_DIMENSION * 2);
					break;
				case 1:
					this.lift.liftHeight = Math.min(this.lift.liftHeight + 1, LiftCustomizationScreen.MAX_DIMENSION * 2);
					break;
				case 2:
					this.lift.liftWidth = Math.max(this.lift.liftWidth - 1, LiftCustomizationScreen.MIN_DIMENSION);
					break;
				case 3:
					this.lift.liftWidth = Math.min(this.lift.liftWidth + 1, LiftCustomizationScreen.MAX_DIMENSION);
					break;
				case 4:
					this.lift.liftDepth = Math.max(this.lift.liftDepth - 1, LiftCustomizationScreen.MIN_DIMENSION);
					break;
				case 5:
					this.lift.liftDepth = Math.min(this.lift.liftDepth + 1, LiftCustomizationScreen.MAX_DIMENSION);
					break;
				case 6:
					this.lift.liftOffsetX = Math.max(this.lift.liftOffsetX - 1, -LiftCustomizationScreen.MAX_OFFSET * 2);
					break;
				case 7:
					this.lift.liftOffsetX = Math.min(this.lift.liftOffsetX + 1, LiftCustomizationScreen.MAX_OFFSET * 2);
					break;
				case 8:
					this.lift.liftOffsetY = Math.max(this.lift.liftOffsetY - 1, -LiftCustomizationScreen.MAX_OFFSET);
					break;
				case 9:
					this.lift.liftOffsetY = Math.min(this.lift.liftOffsetY + 1, LiftCustomizationScreen.MAX_OFFSET);
					break;
				case 10:
					this.lift.liftOffsetZ = Math.max(this.lift.liftOffsetZ - 1, -LiftCustomizationScreen.MAX_OFFSET * 2);
					break;
				case 11:
					this.lift.liftOffsetZ = Math.min(this.lift.liftOffsetZ + 1, LiftCustomizationScreen.MAX_OFFSET * 2);
					break;
				case 12:
					this.lift.isDoubleSided = !this.lift.isDoubleSided;
					break;
				case 13:
					this.lift.liftStyle = this.lift.liftStyle.next();
					break;
				case 14:
					this.lift.facing = this.lift.facing.getCounterClockWise();
					break;
				case 15:
					this.lift.facing = this.lift.facing.getClockWise();
					break;
			}

			this.show();
		});
	}
}
