import { TransportMode } from './TransportMode';
import { ExtensionTrain } from 'ExtensionRegistry/ExtensionRegistry';

type TrainTypeCallback = (transportMode: TransportMode, length: number, width: number) => void;

export class TrainType {

	private static readonly $VALUES: Map<string, TrainType> = new Map();

	public static readonly C_TRAIN_MINI: TrainType = new TrainType("train_9_2", "C_TRAIN_MINI");

	public readonly baseTrainType: string

	private readonly $NAME: string

	private constructor(baseTrainType: string, $NAME: string) {
		this.baseTrainType = baseTrainType,
		this.$NAME = $NAME;
		TrainType.$VALUES.set($NAME, this);
	}

	public static values(): TrainType[] {
		return Array.from(this.$VALUES.values());
	}

	public static valueOf(str: string): TrainType {
		const result = this.$VALUES.get(str);
		return result ?? this.C_TRAIN_MINI;
	}

	public toString(): string {
		return this.$NAME;
	}

	public static getTransportMode(trainType: string): TransportMode {
		const returnTransportMode: TransportMode[] = [TransportMode.TRAIN];
		this.splitTrainType(trainType, ((transportMode, length, width) => returnTransportMode[0] = transportMode));
		return returnTransportMode[0];
	}

	public static getSpacing(trainType: string): number {
		const returnLength: number[] = [1];
		this.splitTrainType(trainType, ((transportMode, length, width) => returnLength[0] = length));
		return returnLength[0] + 1;
	}

	public static getWidth(trainType: string): number {
		const returnWidth: number[] = [1];
		this.splitTrainType(trainType, ((transportMode, length, width) => returnWidth[0] = width));
		return returnWidth[0];
	}

    private static splitTrainType(trainType: string, trainTypeCallback: TrainTypeCallback): void {
		for (const transportMode of TransportMode.values()) {
			const checkString: string = transportMode.toString().toLowerCase() + "_";

			if (trainType.toLowerCase().startsWith(checkString)) {
				const remainingSplit: string[] = trainType.substring(checkString.length).split("_");
				let length = 1;
				let width = 1;

				try {
					length = parseInt(remainingSplit[0]);
					width = parseInt(remainingSplit[1]);
				} catch (error) {
					throw error;
				}

				trainTypeCallback(transportMode, Math.max(length, 1), Math.max(width, 1));
				return;
			}
		}

		for (const defaultTrainType of TrainType.values()) {
			if (trainType.toLowerCase() == defaultTrainType.toString().toLowerCase()) {
				TrainType.splitTrainType(defaultTrainType.baseTrainType, trainTypeCallback);
				return;
			}
		}
	}
}
