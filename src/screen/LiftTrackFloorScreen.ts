import { CustomForm, ObservableBoolean, UIRawMessage } from "@minecraft/server-ui";
import { BetterTextField } from "./BetterTextField";
import { Block, Player, Vector3, world } from "@minecraft/server";
import { BlockLiftTrackFloor } from "block/BlockLiftTrackFloor";

export class LiftTrackFloorScreen {

    private readonly customForm: CustomForm;

    private readonly textFieldFloorNumber: BetterTextField;
    private readonly textFieldFloorDescription: BetterTextField;
    private readonly toggleShouldDing: ObservableBoolean;

    private readonly block: Block | undefined;
    private static readonly TEXT_FLOOR_NUMBER: UIRawMessage = { translate: "gui.mts.lift_floor_number" };
    private static readonly TEXT_FLOOR_DESCRIPTION: UIRawMessage = { translate: "gui.mts.lift_floor_description" };

    public constructor(player: Player, block: Block) {
        this.customForm = new CustomForm(player, "").closeButton();

        let initialFloorNumber = "1";
        let initialFloorDescription = "";
        let initialShouldDing = false;

        if (block.typeId == "mts:lift_track_floor_1") {
            initialFloorNumber = BlockLiftTrackFloor.TileEntityLiftTrackFloorHelper.getFloorNumber(block);
            initialFloorDescription = BlockLiftTrackFloor.TileEntityLiftTrackFloorHelper.getFloorDescription(block);
            initialShouldDing = BlockLiftTrackFloor.TileEntityLiftTrackFloorHelper.getShouldDing(block);
        }

        this.textFieldFloorNumber = new BetterTextField(LiftTrackFloorScreen.TEXT_FLOOR_NUMBER, undefined, initialFloorNumber, 8).addToCustomForm(this.customForm);
        this.textFieldFloorDescription = new BetterTextField(LiftTrackFloorScreen.TEXT_FLOOR_DESCRIPTION, undefined, initialFloorDescription, 128).addToCustomForm(this.customForm);
        this.toggleShouldDing = new ObservableBoolean(initialShouldDing, { clientWritable: true });
        this.customForm.toggle({ translate: "gui.mts.lift_should_ding" }, this.toggleShouldDing);

        this.block = block;
    }

    public show() {
        this.customForm.show().then(() => {
            if (this.block && this.block.isValid) {
                BlockLiftTrackFloor.TileEntityLiftTrackFloorHelper.setData(this.block, this.textFieldFloorNumber.getValue(), this.textFieldFloorDescription.getValue(), this.toggleShouldDing.getData());
            }
        })
    }
}
