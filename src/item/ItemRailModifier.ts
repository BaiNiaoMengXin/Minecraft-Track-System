import { RailType } from "data/RailType";
import { ItemNodeModifierBase } from "./ItemNodeModifierBase";
import { ItemStack, BlockPermutation, Player, world } from "@minecraft/server";
import { RailAngle } from "data/RailAngle";
import { TransportMode } from "data/TransportMode";
import { BlockPos } from "util/math/BlockPos";
import { MTS } from "MTS";
import { Rail } from "data/Rail";
import { BlockNode } from "block/BlockNode";

export class ItemRailModifier extends ItemNodeModifierBase {

	private readonly isOneWay: boolean;
	private readonly railType: RailType;

	public constructor(forNonContinuousMovementNode: boolean, forContinuousMovementNode: boolean, forAirplaneNode: boolean, isOneWay: boolean, railType: RailType) {
		super(forNonContinuousMovementNode, forContinuousMovementNode, forAirplaneNode, true);
		this.isOneWay = isOneWay;
		this.railType = railType;
	}

	protected override onConnect(transportMode: TransportMode, permutationStart: BlockPermutation, permutationEnd: BlockPermutation, posStart: BlockPos, posEnd: BlockPos, facingStart: RailAngle, facingEnd: RailAngle, player: Player): void {
		if (this.railType.hasSavedRail && (MTS.railwayData.hasSavedRail(posStart) || MTS.railwayData.hasSavedRail(posEnd))) {
			if (player != null) {
				player.onScreenDisplay.setActionBar({ translate: "gui.mtr.platform_or_siding_exists" });
			}
		} else {
			let isValidContinuousMovement = false;
			let newRailType: RailType;

			const dimiension = world.getDimension('overworld');
			const blockStart = dimiension.getBlock(posStart.asJson());
			const blockEnd = dimiension.getBlock(posEnd.asJson());

			// TODO
			/* if (transportMode.continuousMovement) {

				if (blockStart instanceof BlockNode.BlockContinuousMovementNode && blockEnd instanceof BlockNode.BlockContinuousMovementNode) {
					if (((BlockNode.BlockContinuousMovementNode) blockStart).isStation && ((BlockNode.BlockContinuousMovementNode) blockEnd).isStation) {
						isValidContinuousMovement = true;
						newRailType = railType.hasSavedRail ? railType : RailType.CABLE_CAR_STATION;
					} else {
						final int differenceX = posEnd.getX() - posStart.getX();
						final int differenceZ = posEnd.getZ() - posStart.getZ();
						isValidContinuousMovement = !railType.hasSavedRail && facingStart.isParallel(facingEnd)
								&& ((facingStart == RailAngle.N || facingStart == RailAngle.S) && differenceX == 0
								|| (facingStart == RailAngle.E || facingStart == RailAngle.W) && differenceZ == 0
								|| (facingStart == RailAngle.NE || facingStart == RailAngle.SW) && differenceX == -differenceZ
								|| (facingStart == RailAngle.SE || facingStart == RailAngle.NW) && differenceX == differenceZ);
						newRailType = RailType.CABLE_CAR;
					}
				} else {
					isValidContinuousMovement = false;
					newRailType = railType;
				}
			} else */{
				isValidContinuousMovement = true;
				newRailType = this.railType;
			}

			const rail1 = new Rail(posStart, facingStart, posEnd, facingEnd, this.isOneWay ? RailType.NONE : newRailType, transportMode);
			const rail2 = new Rail(posEnd, facingEnd, posStart, facingStart, newRailType, transportMode);

			const goodRadius = rail1.goodRadius() && rail2.goodRadius();
			const isValid = rail1.isValid() && rail2.isValid();

			if (goodRadius && isValid && isValidContinuousMovement) {
				MTS.railwayData.addRail(player, transportMode, posStart, posEnd, rail1, false);
				const newId = MTS.railwayData.addRail(player, transportMode, posEnd, posStart, rail2, true);
				blockStart?.setPermutation(permutationStart.withState(BlockNode.IS_CONNECTED as any, true));
				blockEnd?.setPermutation(permutationEnd.withState(BlockNode.IS_CONNECTED as any, true));
			} else {
				player.onScreenDisplay.setActionBar({ translate: isValidContinuousMovement ? goodRadius ? "gui.mtr.invalid_orientation" : "gui.mtr.radius_too_small" : "gui.mtr.cable_car_invalid_orientation" });
			}
		}
	}

	protected override onRemove(posStart: BlockPos, posEnd: BlockPos, player: Player): void {
		MTS.railwayData.removeRailConnection(player, posStart, posEnd);
	}
}
