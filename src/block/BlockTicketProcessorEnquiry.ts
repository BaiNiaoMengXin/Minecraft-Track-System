import { Block, Player, PlayerInteractWithBlockBeforeEvent } from "@minecraft/server";
import { TicketSystem } from "data/TicketSystem";
import { BlockTicketProcessor } from "./BlockTicketProcessor";

export class BlockTicketProcessorEnquiry extends BlockTicketProcessor {

	constructor() {
		super(false, false, false);
	}

	public override use(event: PlayerInteractWithBlockBeforeEvent) {
		const { player, block } = event;
		const playerScore = TicketSystem.getPlayerScore(player, TicketSystem.BALANCE_OBJECTIVE)?.getScore();
		player.onScreenDisplay.setActionBar({
			translate: "gui.mts.balance",
			with: [String(playerScore)]
		});
		player.dimension.playSound(BlockTicketProcessor.TICKET_PROCESSOR_ENTRY, block.location);
	}
}
