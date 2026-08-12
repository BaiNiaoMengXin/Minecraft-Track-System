import { BlockLiftButtons } from "block/BlockLiftButtons";
import { BlockLiftTrackFloor } from "block/BlockLiftTrackFloor";
import { BlockTicketBarrier } from "block/BlockTicketBarrier";
import { BlockTicketMachine } from "block/BlockTicketMachine";
import { BlockTicketProcessor } from "block/BlockTicketProcessor";
import { BlockTicketProcessorEnquiry } from "block/BlockTicketProcessorEnquiry";

export namespace Blocks {

	export const LIFT_BUTTONS_1 = new BlockLiftButtons();
	export const LIFT_TRACK_FLOOR_1 = new BlockLiftTrackFloor();

	export const TICKET_BARRIER_ENTRANCE_1 = new BlockTicketBarrier(true);
	export const TICKET_BARRIER_EXIT_1 = new BlockTicketBarrier(false);
	export const TICKET_MACHINE = new BlockTicketMachine();
	export const TICKET_PROCESSOR = new BlockTicketProcessor(true, true, true);
	export const TICKET_PROCESSOR_ENTRANCE = new BlockTicketProcessor(true, true, false);
	export const TICKET_PROCESSOR_EXIT = new BlockTicketProcessor(true, false, true);
	export const TICKET_PROCESSOR_ENQUIRY = new BlockTicketProcessorEnquiry();
}