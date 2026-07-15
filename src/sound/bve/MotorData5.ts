import { TreeMap } from "jLib/TreeMap";
import { MotorDataBase } from "./MotorDataBase";
import { BveTrainSoundConfig } from "./BveTrainSoundConfig";

class FloatSplines {

	public data: Array<TreeMap<number, number>> = new Array();

	public constructor(textContent: string) {
		const lines = textContent.split("[\\r\\n]+");

		for (const line of lines) {
			const lineTrim = line.trim().toLowerCase();
			if (lineTrim == "") {
				continue;
			}
			if (lineTrim.startsWith("#") || lineTrim.startsWith("//") || lineTrim.startsWith("bvets")) {
				continue;
			}
			const tokens = lineTrim.split(","); // Trailing entries automatically removed

			while (this.data.length < tokens.length - 1) {
				this.data.push(new TreeMap());
			}
			const key = parseFloat(tokens[0].trim());
			for (let i = 1; i < tokens.length; ++i) {
				const tokenTrim = tokens[i].trim();
				if (tokenTrim == "") {
					continue;
				}
				this.data[i - 1].set(key, parseFloat(tokenTrim));
			}
		}
	}

	public getValue(index: number, key: number) {
		const spline = this.data[~~index];
		if (spline.size < 1) {
			return 0;
		}
		const floorEntry = spline.floorEntry(key);
		const ceilingEntry = spline.ceilingEntry(key);
		if (floorEntry == undefined) {
			return ceilingEntry![1];
		} else if (ceilingEntry == undefined) {
			return floorEntry![1];
		} else if (FloatSplines.floatEquals(floorEntry[0], ceilingEntry[0])) {
			return floorEntry[1];
		} else {
			return floorEntry[1] + (ceilingEntry[1] - floorEntry[1]) *
					((key - floorEntry[0]) / (ceilingEntry[0] - floorEntry[0]));
		}
	}

	private static floatEquals(a: number, b: number): boolean {
		if (a === b) return true;
		
		if (a === Infinity && b == Infinity) return true;
		if (a === -Infinity && b == -Infinity) return true;

		return Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b)) * 1e-7;
	}
}

export class MotorData5 extends MotorDataBase { // 5 for BVE5 and BVE6

	private readonly powerVolume: FloatSplines;
	private readonly powerFrequency: FloatSplines;
	private readonly brakeVolume: FloatSplines;
	private readonly brakeFrequency: FloatSplines;
	private readonly soundCount: number;

	public constructor(baseName: string) {
		super()
		this.powerVolume = new FloatSplines(BveTrainSoundConfig.readResource(baseName + "/powervol.csv"));
		this.powerFrequency = new FloatSplines(BveTrainSoundConfig.readResource(baseName + "/powerfreq.csv"));
		this.brakeVolume = new FloatSplines(BveTrainSoundConfig.readResource(baseName + "/brakevol.csv"));
		this.brakeFrequency = new FloatSplines(BveTrainSoundConfig.readResource(baseName + "/brakefreq.csv"));
		this.soundCount = Math.max(
				Math.max(this.powerVolume.data.length, this.powerFrequency.data.length),
				Math.max(this.brakeVolume.data.length, this.brakeFrequency.data.length)
		);
	}

	public override getSoundCount() {
		return this.soundCount;
	}

	public override getPitch(index: number, speed: number, power: number) {
		if (power == 0) {
			return 0;
		}
		return power > 0 ? this.powerFrequency.getValue(index, speed) : this.brakeFrequency.getValue(index, speed);
	}

	public override getVolume(index: number, speed: number, power: number) {
		if (power == 0) {
			return 0;
		}
		return (power > 0 ? this.powerVolume.getValue(index, speed) : this.brakeVolume.getValue(index, speed)) * Math.abs(power);
	}
}
