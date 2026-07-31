import { PlayerInteractWithBlockBeforeEvent } from "@minecraft/server";
import { BlockBase } from "./BlockBase";
import { TicketMachineScreen } from "screen/TicketMachineScreen";

export class BlockTicketMachine extends BlockBase {

	public override use(event: PlayerInteractWithBlockBeforeEvent) {
		new TicketMachineScreen(event.player).show();
	}
}
