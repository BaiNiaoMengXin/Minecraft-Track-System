import { SoundInstance, Vector3, world } from "@minecraft/server";
import { Train } from "data/Train";
import { BlockPos } from "util/math/BlockPos";
import { Vec3 } from "util/math/Vec3";

export class TrainLoopingSoundInstance {

    private readonly train: Train;

    private wrapper: SoundInstance | undefined;

    private readonly event: string;
    private lastPos: Vector3 | undefined;

    public constructor(event: string, train: Train) {
        this.train = train;
        this.event = event;
    }

    private playNewSound(volume: number, pitch: number, pos: Vector3) {
        this.wrapper = world.getDimension("overworld").playSound(this.event, pos, {
            loopCount: -1,
            pitch: pitch,
            volume: volume
        });
        this.lastPos = pos;
    }

    public setData(volume: number, pitch: number, pos: Vector3) {
        if (pitch == 0) {
            pitch = 1;
        }

        if (!this.wrapper) {
            this.playNewSound(volume, pitch, pos);
        } else {
            if (!this.wrapper.durationInfo) return;

            const dx = pos.x - this.lastPos!.x;
            const dy = pos.y - this.lastPos!.y;
            const dz = pos.z - this.lastPos!.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist > 5) {
                const playBackPos = this.wrapper.durationInfo.getPlaybackPosition();
                this.wrapper.stop();
                this.playNewSound(volume, pitch, pos);
                this.wrapper.seekTo(playBackPos);
            } else {
                this.wrapper.setVolume(Math.max(volume * (1 + (dist * 0.2)), 0.01));
                this.wrapper.setPitch(pitch);
            }
        }
    }
}