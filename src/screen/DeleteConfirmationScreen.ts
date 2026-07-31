import { Player } from "@minecraft/server";
import { CustomForm } from "@minecraft/server-ui";
import { IGui } from "data/IGui";

export class DeleteConfirmationScreen {

	private readonly customForm: CustomForm;

	private readonly callback: (isDelete: boolean) => void;

	public constructor(player: Player, callback: (isDelete: boolean) => void, name: string) {
		this.customForm = new CustomForm(player, {
			translate: "gui.mts.delete_confirmation",
			with: [IGui.formatStationName(name)]
		});
		
		this.callback = callback;

		this.customForm.button({ translate: "gui.yes" }, () => this.onClickButton(true));
		this.customForm.button({ translate: "gui.no" }, () => this.onClickButton(false));
	}

	public show() {
		this.customForm.show();
	}

	private onClickButton(isDelete: boolean): void {
		this.customForm.close();
		this.callback(isDelete);
	}
}
