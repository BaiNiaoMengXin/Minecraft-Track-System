import { Block, Player, PlayerInteractWithBlockBeforeEvent, system } from "@minecraft/server";
import { TicketSystem } from "data/TicketSystem";
import { BlockBase } from "./BlockBase";

enum EnumTicketProcessorLights {

	NONE ="none",
	RED = "red",
	YELLOW_GREEN = "yellow_green",
	GREEN = "green"
}

export class BlockTicketProcessor extends BlockBase {

	private static readonly STATE_LIGHTS = "mts:lights";

	public static readonly TICKET_PROCESSOR_ENTRY = "mts:ticket_processor_entry";
	public static readonly TICKET_PROCESSOR_ENTRY_CONCESSIONARY = "mts:ticket_processor_entry_concessionary";
	public static readonly TICKET_PROCESSOR_EXIT = "mts:ticket_processor_exit";
	public static readonly TICKET_PROCESSOR_EXIT_CONCESSIONARY = "mts:ticket_processor_exit_concessionary";
	public static readonly TICKET_PROCESSOR_FAIL = "mts:ticket_processor_fail";

	private readonly hasLight: boolean;
	private readonly canEnter: boolean;
	private readonly canExit: boolean;

	constructor(hasLight: boolean, canEnter: boolean, canExit: boolean) {
		super();
		this.hasLight = hasLight;
		this.canEnter = canEnter;
		this.canExit = canExit;
	}

	public override use(event: PlayerInteractWithBlockBeforeEvent) {
		const { player, block } = event;

		// if (permutation.getState("minecraft:vertical_half") == "upper") {
			const open = TicketSystem.passThrough(
				block.location,
				player,
				this.canEnter,
				this.canExit,
				BlockTicketProcessor.TICKET_PROCESSOR_ENTRY,
				BlockTicketProcessor.TICKET_PROCESSOR_ENTRY_CONCESSIONARY,
				BlockTicketProcessor.TICKET_PROCESSOR_EXIT,
				BlockTicketProcessor.TICKET_PROCESSOR_EXIT_CONCESSIONARY,
				BlockTicketProcessor.TICKET_PROCESSOR_FAIL,
				true
			);
			block.setPermutation(block.permutation.withState(BlockTicketProcessor.STATE_LIGHTS as any, (open != TicketSystem.EnumTicketBarrierOpen.CLOSED) ? EnumTicketProcessorLights.GREEN : EnumTicketProcessorLights.RED));
			// TODO better schedule block tick
			if (this.hasLight) {
				system.runTimeout(() => {
					block.setPermutation(block.permutation.withState(BlockTicketProcessor.STATE_LIGHTS as any, EnumTicketProcessorLights.NONE));
				}, 20);
			}
		// }
	}
}
