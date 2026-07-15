import { BveTrainSoundConfig } from "./BveTrainSoundConfig";

export class ConfigFile {

	public readonly run = new Array<string>(1);
	public readonly flange = new Array<string>(1);
	public readonly motor = new Array<string>(40);
	public readonly joint = new Array<string>(1);

	public readonly air: string | null;
	public readonly airZero: string | null;
	public readonly airHigh: string | null;
	public readonly brakeEmergency: string | null;

	public readonly doorOpen: string | null;
	public readonly doorClose: string | null;

	public readonly brakeHandleApply: string | null;
	public readonly brakeHandleRelease: string | null;

	public readonly compressorAttack: string | null;
	public readonly compressorLoop: string | null;
	public readonly compressorRelease: string | null;

	public readonly noise: string | null;
	public readonly shoe: string | null;

	public readonly motorNoiseDataType: number;

	public readonly motorVolumeMultiply: number;

	public readonly breakerDelay: number;
	public readonly regenerationLimit: number;

	public readonly motorOutputAtCoast: number;

	public readonly mrPressMin: number = 700; // kPa
	public readonly mrPressMax: number = 800; // kPa
	public readonly mrCompressorSpeed: number = 5; // kPa/s
	public readonly mrServiceBrakeReduce: number = 5; // kPa each time

	public readonly doorCloseSoundLength: number;

	public constructor(textContent: string, config: BveTrainSoundConfig) {
		const lines = textContent.split(/[\r\n]+/);
		let section = "";

		let air: string | null = null;
		let airZero: string | null = null;
		let airHigh: string | null = null;
		let brakeEmergency: string | null = null;

		let doorOpen: string | null = null;
		let doorClose: string | null = null;

		let brakeHandleApply: string | null = null;
		let brakeHandleRelease: string | null = null;

		let compressorAttack: string | null = null;
		let compressorLoop: string | null = null;
		let compressorRelease: string | null = null;

		let noise: string | null = null;
		let shoe: string | null = null;

		let motorNoiseDataType = 5; // 4 or 5
		let motorVolumeMultiply = 1;
		let breakerDelay = 0;
		let regenerationLimit = 0; // m/s
		let motorOutputAtCoast = 0.4;
		let doorCloseSoundLength = 1;

		for (const line of lines) {
			const trimLine = line.trim().replaceAll("\\s*(;|#|//).+", "");
			if (trimLine == "") {
				continue;
			}

			if (trimLine.includes("=")) {
				const tokens = trimLine.split("=");
				if (tokens.length != 2) {
					continue;
				}

				const key = tokens[0].trim().toLowerCase().replaceAll("\\s", "");
				const value = tokens[1].trim().toLowerCase().replace("\\", "/").replaceAll("\\.wav|\\s|.+/", "");
				if (value == "") {
					continue;
				}

				const valueAsstring = config.audioBaseName + value.replaceAll(".wav", "").replaceAll(".ogg", "").replaceAll(".fsb", "");
				switch (section) {
					case "mtr":
						switch (key) {
							case "motornoisedatatype":
								this.motorNoiseDataType = parseInt(value);
								break;
							case "motorvolumemultiply":
								this.motorVolumeMultiply = parseFloat(value);
								break;
							case "doorclosesoundlength":
								doorCloseSoundLength = parseFloat(value);
								break;
							case "breakerdelay":
								breakerDelay = parseFloat(value);
								break;
							case "regenerationlimit":
								regenerationLimit = parseFloat(value) / 3.6;
								break;
							case "motoroutputatcoast":
								this.motorOutputAtCoast = parseFloat(value);
								break;
						}
						break;
					case "run":
					case "rolling":
						if (parseInt(key) >= this.run.length) {
							break;
						}
						this.run[parseInt(key)] = valueAsstring;
						break;
					case "flange":
						if (parseInt(key) >= this.flange.length) {
							break;
						}
						this.flange[parseInt(key)] = valueAsstring;
						break;
					case "motor":
						if (parseInt(key) >= this.motor.length) {
							break;
						}
						this.motor[parseInt(key)] = valueAsstring;
						break;
					case "joint":
					case "switch":
						if (parseInt(key) >= this.joint.length) {
							break;
						}
						this.joint[parseInt(key)] = valueAsstring;
						break;
					case "brake":
						switch (key) {
							case "bcrelease":
								air = valueAsstring;
								break;
							case "bcreleasefull":
								airZero = valueAsstring;
								break;
							case "bcreleasehigh":
								airHigh = valueAsstring;
								break;
							case "emergency":
								brakeEmergency = valueAsstring;
								break;
						}
						break;
					case "door":
						switch (key) {
							case "open":
							case "openleft":
							case "openright":
								doorOpen = valueAsstring;
								break;
							case "close":
							case "closeleft":
							case "closeright":
								doorClose = valueAsstring;
								break;
						}
					case "brakehandle":
						switch (key) {
							case "apply":
								brakeHandleApply = valueAsstring;
								break;
							case "release":
								brakeHandleRelease = valueAsstring;
								break;
						}
						break;
					case "compressor":
						switch (key) {
							case "attack":
								compressorAttack = valueAsstring;
								break;
							case "loop":
								compressorLoop = valueAsstring;
								break;
							case "release":
								compressorRelease = valueAsstring;
								break;
						}
					case "others":
						switch (key) {
							case "noise":
								noise = valueAsstring;
								break;
							case "shoe":
								shoe = valueAsstring;
								break;
						}
				}
			} else if (trimLine.startsWith("[") && trimLine.endsWith("]")) {
				section = trimLine.substring(1, trimLine.length - 1).trim().replace(" ", "").toLowerCase();
			}
		}

		if (airZero == null) {
			airZero = air;
		}

		if (airHigh == null) {
			airHigh = air;
		}

		this.air = air;
		this.airZero = airZero;
		this.airHigh = airHigh;
		this.brakeEmergency = brakeEmergency;
		this.doorOpen = doorOpen;
		this.doorClose = doorClose;
		this.brakeHandleApply = brakeHandleApply;
		this.brakeHandleRelease = brakeHandleRelease;
		this.compressorAttack = compressorAttack;
		this.compressorLoop = compressorLoop;
		this.compressorRelease = compressorRelease;
		this.noise = noise;
		this.shoe = shoe;
		this.motorNoiseDataType = motorNoiseDataType;
		this.motorVolumeMultiply = motorVolumeMultiply;
		this.breakerDelay = breakerDelay;
		this.regenerationLimit = regenerationLimit;
		this.motorOutputAtCoast = motorOutputAtCoast;
		this.doorCloseSoundLength = doorCloseSoundLength;
	}
}
