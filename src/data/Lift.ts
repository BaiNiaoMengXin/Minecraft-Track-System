import { ButtonState, Entity, InputButton, Player, system, world } from "@minecraft/server";
import { LiftBase } from "./LiftBase";
import { VehicleRiding } from "./VehicleRiding";
import { Direction } from "util/math/Direction";
import { BlockPos } from "util/math/BlockPos";
import { Mth } from "util/math/Mth";
import { Train } from "./Train";
import { LiftSelectionScreen } from "screen/LiftSelectionScreen";
import { IDispose } from "util/IDispose";

export class Lift extends LiftBase implements IDispose {

    private readonly vehicleRiding = new VehicleRiding(this.ridingEntities);
    private liftEntityId: string | null;
    private liftEntity: Entity | null;

    private static readonly LIFT_UPDATE_DISTANCE = 48;

    public constructor(pos: BlockPos, facing: Direction);
    public constructor(map: Record<string, unknown>);

    constructor(arg1: BlockPos | Record<string, unknown>, facing?: Direction) {
        if (facing !== undefined) {
            super(arg1 as BlockPos, facing);
            this.liftEntity = world.getDimension("overworld").spawnEntity<string>("mts:lift", (arg1 as BlockPos).asJson());
            this.liftEntityId = null;
            this.updateEntity();
        } else {
            super(arg1 as Record<string, unknown>);
            const entityId = arg1 as unknown as ReturnType<this["toMessagePack"]>["lift_entity_id"];
            this.liftEntity = null;
            this.liftEntityId = entityId;
        }
    }

    public override toMessagePack() {
        return {
            ...super.toMessagePack(),

            lift_entity_id: this.liftEntity == null ? this.liftEntityId! : this.liftEntity?.id
        };
    }

    public dispose(): void {
        system.run(() => {
            if (this.liftEntity == null && this.liftEntityId != null) {
                this.tryGetEntity();
            }
            this.liftEntity?.remove()
        });
    }

    public updateEntity(): void {
        this.liftEntity?.setProperty("mts:width", this.liftWidth);
        this.liftEntity?.setProperty("mts:depth", this.liftDepth);
        this.liftEntity?.setProperty("mts:height", this.liftHeight);
        this.liftEntity?.setProperty("mts:is_double_sided", this.isDoubleSided);
    }

    public tick() {
        if (this.ridingEntities.size == 0 && world.getAllPlayers().some(player => {
            const playerPos = player.location;
            return (Math.abs(this.currentPositionX - playerPos.x) + Math.abs(this.currentPositionY - playerPos.y) + Math.abs(this.currentPositionZ - playerPos.z)) < 32;
        })) {
            return;
        }

        this.tick2(1);

        const x = this.currentPositionX + this.liftOffsetX / 2;
        const y = this.currentPositionY + this.liftOffsetY;
        const z = this.currentPositionZ + this.liftOffsetZ / 2;

        if (this.liftEntity == null && this.liftEntityId != null) {
            this.tryGetEntity();
        }

        if (this.liftEntity != null) {
            this.liftEntity.teleport({ x, y, z }, { rotation: { x, y: Mth.toDegrees(this.getYaw()) } });// no rotate animation
            this.liftEntity.setProperty("mts:door_state", this.doorOpen ? ((this.frontCanOpen ? 1 : 0) + (this.backCanOpen ? 2 : 0)) : 0);
        }

        this.vehicleRiding.mountRider(1, x, y, z, this.liftWidth - 1, this.liftDepth - 1, this.getYaw(), 0, this.doorValue > 0, true, 0, player => true, player => {
        });

        this.vehicleRiding.movePlayer(playerId => {
            this.vehicleRiding.setOffsets(playerId, x, y, z, this.getYaw(), 0, this.liftWidth - 1, this.liftDepth - 1, this.frontCanOpen, this.backCanOpen, false, false, 0, 0);
            this.vehicleRiding.moveSelf(playerId, this.liftWidth - 1, this.liftDepth - 1, this.getYaw(), 0, 1, this.frontCanOpen, this.backCanOpen, true, 1);
        });

        for (const [playerId] of this.ridingEntities) {
            const player = world.getEntity(playerId) as Player;

            if (player.inputInfo.getButtonState(InputButton.Jump) == ButtonState.Pressed) {
                new LiftSelectionScreen(player, this).show();
            }
            if (Train.showShiftProgressBar(player)) {
                player.onScreenDisplay.setActionBar({ translate: "gui.mts.press_to_select_floor" });
            }
        }
    }

    private tryGetEntity(): void {
        this.liftEntity = world.getEntity(this.liftEntityId!) ?? null;
        if (this.liftEntity != null) {
            this.liftEntityId = null;
        }
    }
}
