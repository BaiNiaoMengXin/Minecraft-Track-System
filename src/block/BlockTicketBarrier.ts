import { Block, Entity, Player, system, Vector3 } from "@minecraft/server";
import { TicketSystem } from "data/TicketSystem";
import { Direction } from "util/math/Direction";
import { Vec3 } from "util/math/Vec3";
import { EntityInsideableBlock } from "./EntityInsideableBlock";

export class BlockTicketBarrier extends EntityInsideableBlock {

	private static readonly STATE_OPEN = "mts:open"

	private static readonly TICKET_BARRIER = "mts:ticket_barrier";
	private static readonly TICKET_BARRIER_CONCESSIONARY = "mts:ticket_barrier_concessionary";

	private readonly isEntrance: boolean;

	public constructor(isEntrance: boolean) {
		super();
		this.isEntrance = isEntrance;
	}


	public override entityInside(entity: Entity, block: Block): void {
		if (entity instanceof Player) {
			const { permutation, location: pos } = block;

			const facing = Direction.valueOf(permutation.getState("minecraft:cardinal_direction")!, false)!;

			const playerPosRotated = Vec3.fromVector3(entity.location).subtract(pos.x + 0.5, 0, pos.z + 0.5).yRot_Degrees(facing.toYRot());
			const open = permutation.getState(BlockTicketBarrier.STATE_OPEN as any) as TicketSystem.EnumTicketBarrierOpen;

			if (open != TicketSystem.EnumTicketBarrierOpen.CLOSED && playerPosRotated.z > 0) {
				block.setPermutation(permutation.withState(BlockTicketBarrier.STATE_OPEN as any, TicketSystem.EnumTicketBarrierOpen.CLOSED));

			} else if (open == TicketSystem.EnumTicketBarrierOpen.CLOSED && playerPosRotated.z < 0) {
				const newOpen = TicketSystem.passThrough(
					pos,
					entity,
					this.isEntrance,
					!this.isEntrance,
					BlockTicketBarrier.TICKET_BARRIER,
					BlockTicketBarrier.TICKET_BARRIER_CONCESSIONARY,
					BlockTicketBarrier.TICKET_BARRIER,
					BlockTicketBarrier.TICKET_BARRIER_CONCESSIONARY,
					"",
					false
				);
				block.setPermutation(permutation.withState(BlockTicketBarrier.STATE_OPEN as any, newOpen));
				if (newOpen != TicketSystem.EnumTicketBarrierOpen.CLOSED) {
					// TODO better schedule block tick
					system.runTimeout(() => {
						block.setPermutation(permutation.withState(BlockTicketBarrier.STATE_OPEN as any, TicketSystem.EnumTicketBarrierOpen.CLOSED));
					}, 40);
				}
			}
		}
	}
}