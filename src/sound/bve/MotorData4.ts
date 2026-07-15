import { Mth } from "util/math/Mth";
import { MotorDataBase } from "./MotorDataBase";
import { BveTrainSoundConfig } from "./BveTrainSoundConfig";

class Channel {
	public soundIds: number[] = [];
	public pitches: number[] = [];
	public volumes: number[] = [];
	public maxEntryId = -1;
	public maxSoundId = -1;
}

export class MotorData4 extends MotorDataBase { // 4 for BVE4 and OpenBVE

	private readonly channels: Channel[] = new Array<Channel>(4);
	private readonly soundCount: number;

	public constructor(baseName: string) {
		super();
		for (let i = 0; i < this.channels.length; ++i) {
			this.channels[i] = new Channel();
		}

		const textContent = BveTrainSoundConfig.readResource(baseName + "/train.dat");
		const lines = textContent.split("[\\r\\n]+");
		let section = "";
		for (const line of  lines) {
			const lineTrim = line.trim().toLowerCase();
			if (lineTrim == "") {
				continue;
			}
			if (lineTrim.startsWith("#")) {
				section = lineTrim.substring(1).trim().toLowerCase();
				continue;
			}
			switch (section) {
				case "motor_p1":
				case "motor_p2":
				case "motor_b1":
				case "motor_b2":
					const listIndex = (section.charAt(6) == 'p' ? 0 : 2) + (section.charAt(7) == '1' ? 0 : 1);
					const tokens = lineTrim.split(",");
					this.channels[listIndex].soundIds.push(parseInt(tokens[0]));
					this.channels[listIndex].pitches.push(parseFloat(tokens[1]) / 100);
					this.channels[listIndex].volumes.push(parseFloat(tokens[2]) / 128);
					this.channels[listIndex].maxSoundId = Math.max(this.channels[listIndex].maxSoundId, parseInt(tokens[0]));
					this.channels[listIndex].maxEntryId++;
					break;
			}
		}

		let maxSoundId = -1;
		for (const channel of this.channels) {
			maxSoundId = Math.max(maxSoundId, channel.maxSoundId);
		}
		this.soundCount = ~~maxSoundId + 1;
	}

	public override getSoundCount() {
		return this.soundCount;
	}

	public override getPitch(index: number, speed: number, power: number) {
		index = ~~index;
		if (power == 0) {
			return 0;
		}
		const offset = power > 0 ? 0 : 2;
		const entryIndex = ~~(speed / 0.2);
		if (index == MotorData4.getSafe(this.channels[offset].soundIds, Math.min(this.channels[offset].maxEntryId, entryIndex))) {
			return MotorData4.getSafe(this.channels[offset].pitches, entryIndex);
		}
		if (index == MotorData4.getSafe(this.channels[offset + 1].soundIds, Math.min(this.channels[offset + 1].maxEntryId, entryIndex))) {
			return MotorData4.getSafe(this.channels[offset + 1].pitches, entryIndex);
		}
		return 0;
	}

	public override getVolume(index: number, speed: number, power: number) {
		index = ~~index;
		if (power == 0) {
			return 0;
		}
		const offset = power > 0 ? 0 : 2;
		const entryIndex = ~~(speed / 0.2);
		if (index == MotorData4.getSafe(this.channels[offset].soundIds, Math.min(this.channels[offset].maxEntryId, entryIndex))) {
			return MotorData4.getSafe(this.channels[offset].volumes, entryIndex) * Math.abs(power);
		}
		if (index == MotorData4.getSafe(this.channels[offset + 1].soundIds, Math.min(this.channels[offset + 1].maxEntryId, entryIndex))) {
			return MotorData4.getSafe(this.channels[offset + 1].volumes, entryIndex) * Math.abs(power);
		}
		return 0;
	}

	private static getSafe<T>(list: T[], index: number): T {
		return list[Mth.clamp(~~index, 0, list.length - 1)];
	}
}
