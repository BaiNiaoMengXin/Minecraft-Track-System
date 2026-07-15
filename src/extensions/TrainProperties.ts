import { JonTrainSound, JonTrainSoundConfig } from "sound/JonTrainSound.";
import { TrainSoundBase } from "sound/TrainSoundBase";
import { TrainModels } from "./TrainModels";

export class TrainProperties {

	public readonly baseTrainType: string;
	public readonly name: string;
	public readonly description: string | null;
	public readonly riderOffset: number;
	public readonly riderOffsetDismounting: number;
	public readonly models: TrainModels;
	public readonly sound: TrainSoundBase;
	public readonly bogiePosition: number;

	private static readonly blankProperties = new TrainProperties(
		"", "", null, 0, 0, 0,
		new TrainModels([]),
		new JonTrainSound("", new JonTrainSoundConfig(null, 0, 0.5, false))
	);

	public constructor(baseTrainType: string, name: string, description: string | null, riderOffset: number, riderOffsetDismounting: number, bogiePosition: number, models: TrainModels, sound: TrainSoundBase) {
		this.baseTrainType = baseTrainType;
		this.name = name;
		this.description = description;
		this.riderOffset = riderOffset;
		this.riderOffsetDismounting = riderOffsetDismounting;
		this.bogiePosition = bogiePosition;
		this.models = models;
		this.sound = sound;
	}

	public static getBlankProperties(): TrainProperties {
		return this.blankProperties;
	}
}
