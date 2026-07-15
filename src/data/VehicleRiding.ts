import { Entity, EntityComponentTypes, GameMode, Player, world } from "@minecraft/server";
import { MTS } from "MTS";
import { AABB } from "util/AABB";
import { Mth } from "util/math/Mth";
import { Vec3 } from "util/math/Vec3";

export class VehicleRiding {

	private readonly percentagesX: Map<string, number> = new Map();
	private readonly percentagesZ: Map<string, number> = new Map();
	private readonly ridingEntities: Map<string, Entity>;

	private static readonly INNER_PADDING = 0.5;
	private static readonly BOX_PADDING = 3;

	private static readonly VEHICLE_WALKING_SPEED_MULTIPLIER = 0.25;

	public constructor(ridingEntities: Map<string, Entity>) {
		this.ridingEntities = ridingEntities;
	}

    private getPlayer(playerId: string): Player | undefined {
        return world.getAllPlayers().find(p => p.id == playerId);
    }

	public movePlayer(ridingEntityCallback: (id: string) => void) {
		this.ridingEntities.forEach((entity, playerId) => {
			if (!this.percentagesX.has(playerId)) {
				this.percentagesX.set(playerId, 0.5);
			}
			if (!this.percentagesZ.has(playerId)) {
				this.percentagesZ.set(playerId, 0.5);
			}

			ridingEntityCallback(playerId);
		});
	}

	public setOffsets(playerId: string, x: number, y: number, z: number, yaw: number, pitch: number, length: number, width: number, doorLeftOpen: boolean, doorRightOpen: boolean, hasPitchAscending: boolean, hasPitchDescending: boolean, riderOffset: number, riderOffsetDismounting: number/*, clientPlayerCallback: () => void*/): void {
        
        const percentageX = VehicleRiding.getValueFromPercentage(this.percentagesX.get(playerId)!, width);
		const riderOffsetNew = doorLeftOpen && percentageX < 0 || doorRightOpen && percentageX > 1 ? riderOffsetDismounting : riderOffset;
		const playerOffset = new Vec3(percentageX, riderOffsetNew, VehicleRiding.getValueFromPercentage(Mth.frac(this.percentagesZ.get(playerId)!), length)).xRot((pitch < 0 ? hasPitchAscending : hasPitchDescending) ? pitch : 0).yRot(yaw);

        const moveX = x + playerOffset.x;
        const moveY = y + playerOffset.y;
        const moveZ = z + playerOffset.z;

		const entity = this.ridingEntities.get(playerId);
        entity!.teleport({ x: moveX, y: moveY, z: moveZ });
		// const rideable = entity!.getComponent(EntityComponentTypes.Rideable)!;
		// if (rideable.getRiders().length == 0) {
		// 	rideable.addRider(world.getAllPlayers().find(p => p.id == playerId)!)
		// 	MTS.railwayData.railwayDataCoolDownModule.updatePlayerRiding
		// }

        // clientPlayerCallback();
	}

    public removeRiding(playerId: string): void {
        this.ridingEntities.get(playerId)?.remove();
        this.ridingEntities.delete(playerId);
    }

	public moveSelf(playerId: string, length: number, width: number, yaw: number, percentageOffset: number, maxPercentage: number, doorLeftOpen: boolean, doorRightOpen: boolean, noGangwayConnection: boolean, ticksElapsed: number): void {
        const player = this.getPlayer(playerId);
		const speedMultiplier = ticksElapsed * VehicleRiding.VEHICLE_WALKING_SPEED_MULTIPLIER;

        if (player == undefined) {
            if (this.ridingEntities.has(playerId)) {
                this.removeRiding(playerId);
            }
            return;
        } else {
            if (!this.ridingEntities.has(playerId)) {
                return;
            }
        }
		
        const movementTemp = player.inputInfo.getMovementVector()
        const movement = new Vec3(movementTemp.x * speedMultiplier, 0, movementTemp.y * speedMultiplier).yRot(-Mth.toRadians(player.getRotation().y) - yaw);
        const tempPercentageX = this.percentagesX.get(playerId)! + movement.x / width;
        const tempPercentageZ = this.percentagesZ.get(playerId)! + (length == 0 ? 0 : movement.z / length);
        const newPercentageX = Mth.clamp(tempPercentageX, doorLeftOpen ? -3 : 0, doorRightOpen ? 4 : 1);
        const newPercentageZ = Mth.clamp(tempPercentageZ, (noGangwayConnection ? percentageOffset + 0.05 : 0) + 0.01, (noGangwayConnection ? percentageOffset + 0.95 : maxPercentage) - 0.01);

		this.percentagesX.set(playerId, newPercentageX);
		this.percentagesZ.set(playerId, newPercentageZ);
	}

	private startRiding(player: Player, percentageX: number, percentageZ: number): void {
        const playerId = player.id;
        const entity = player.dimension.spawnEntity<string>("mts:transparent_carrier", player.location);
        entity.getComponent(EntityComponentTypes.Rideable)?.addRider(player);

		this.ridingEntities.set(playerId, entity);
		this.percentagesX.set(playerId, percentageX);
		this.percentagesZ.set(playerId, percentageZ);
	}

	public getPercentageZ(playerId: string): number {
		return this.percentagesZ.get(playerId)!;
	}

	private static getValueFromPercentage(percentage: number, total: number): number {
		return (percentage - 0.5) * total;
	}


	public mountRider(routeId: number, carX: number, carY: number, carZ: number, length: number, width: number, carYaw: number, carPitch: number, doorOpen: boolean, canMount: boolean, percentageOffset: number, canRide: (player: Player) => boolean, ridingCallback: (player: Player) => void) {
		const halfLength = length / 2;
		const halfWidth = width / 2;

		if (canMount) {
			const margin = halfLength + VehicleRiding.BOX_PADDING;
            const aabb = new AABB(carX + margin, carY + margin, carZ + margin, carX - margin, carY - margin, carZ - margin);
			world.getAllPlayers().forEach(player => {
				if (aabb.contains(player.location) && player.getGameMode() != GameMode.Spectator && !this.ridingEntities.has(player.id) && MTS.railwayData.railwayDataCoolDownModule.canRide(player) && canRide(player)) {
					const positionRotated = Vec3.fromVector3(player.location).subtract(carX, carY, carZ).yRot(-carYaw).xRot(-carPitch);
					if (Math.abs(positionRotated.x) < halfWidth + VehicleRiding.INNER_PADDING && Math.abs(positionRotated.y) < 2.5 && Math.abs(positionRotated.z) <= halfLength && !MTS.railwayData.railwayDataCoolDownModule.shouldDismount(player)) {
						const percentageX = positionRotated.x / width + 0.5;
						const percentageZ = (length == 0 ? 0 : positionRotated.z / length + 0.5) + percentageOffset;
						this.startRiding(player, percentageX, percentageZ);
					}
				}
			});
		}

		const ridersToRemove = new Set<string>();
		this.ridingEntities.forEach((entityId, playerId) => {
			const player = this.getPlayer(playerId)

			if (player !== undefined) {
				let remove: boolean;

				if (player.getGameMode() == GameMode.Spectator || MTS.railwayData.railwayDataCoolDownModule.shouldDismount(player)) {
					remove = true;
				} else if (doorOpen) {
					const positionRotated = Vec3.fromVector3(player.location).subtract(carX, carY, carZ).yRot(-carYaw).xRot(-carPitch);
					remove = Math.abs(positionRotated.z) <= halfLength && (Math.abs(positionRotated.x) > halfWidth + VehicleRiding.INNER_PADDING || Math.abs(positionRotated.y) > 10);
				} else {
					remove = false;
				}

				if (remove) {
					ridersToRemove.add(playerId);
				}

                MTS.railwayData.railwayDataCoolDownModule.updatePlayerRiding(player, routeId);
				ridingCallback(player);
			}
		});

		if (ridersToRemove.size != 0) {
			ridersToRemove.forEach(riderToRemove => {
                this.removeRiding(riderToRemove);
            });
		}
	}
}
