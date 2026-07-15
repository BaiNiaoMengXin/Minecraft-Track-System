import { TrainType } from "data/TrainType";
import { TransportMode } from "data/TransportMode";
import { TrainProperties } from "./TrainProperties";
import { TrainModels } from "./TrainModels";
import { JonTrainSound, JonTrainSoundConfig } from "sound/JonTrainSound.";
import { BveTrainSound } from "sound/bve/BveTrainSound";
import { BveTrainSoundConfig } from "sound/bve/BveTrainSoundConfig";
import { TrainSoundBase } from "sound/TrainSoundBase";

export class TrainRegistry {

	private static readonly REGISTRY: Map<string, TrainProperties> = new Map();
	private static readonly KEY_ORDERS: Map<TransportMode, Array<string>>  = new Map();

	public static register(key: string, properties: TrainProperties): void;
	public static register(key: string, baseTrainType: string, name: string | null, description: string | null, models: TrainModels, riderOffset: number, riderOffsetDismounting: number, bogiePosition: number, soundId: string | null, legacySoundConfig: JonTrainSoundConfig | null): void;

	public static register(key: string, arg1: TrainProperties | string, arg2?: string | null, arg3?: string | null, arg4?: TrainModels, arg5?: number, arg6?: number, arg7?: number, arg8?: string | null, arg9?: JonTrainSoundConfig | null): void {
		if (typeof arg1 !== "string") {
			const keyLower = key.toLowerCase();
			const transportMode = TrainType.getTransportMode(arg1.baseTrainType);
			if (!this.KEY_ORDERS.has(transportMode)) {
				this.KEY_ORDERS.set(transportMode, []);
			}
			if (!this.KEY_ORDERS.get(transportMode)!.includes(keyLower)) {
				this.KEY_ORDERS.get(transportMode)!.push(keyLower);
			}
			this.REGISTRY.set(keyLower, arg1);
		} else {
			arg9 = arg9 as JonTrainSoundConfig | null;
			arg2 = arg2 as string | null
			const sound: TrainSoundBase = arg9 == null ? new BveTrainSound(new BveTrainSoundConfig(arg8 == null ? "" : arg8)) : new JonTrainSound(arg8!, arg9);
			this.register(key, new TrainProperties(arg1, arg2 == null ? "train.mts." + key.toLowerCase() : arg2, arg3 as string | null, arg5!, arg6!, arg7!, arg4!, sound));
		}

		console.log(Array.from(this.REGISTRY))
	}

	private static register2(defaultTrainType: TrainType, models: TrainModels, soundId: string, legacySoundConfig: JonTrainSoundConfig): void;
	private static register2(defaultTrainType: TrainType, models: TrainModels, riderOffset: number, riderOffsetDismounting: number, bogiePosition: number): void;

	private static register2(defaultTrainType: TrainType, models: TrainModels, arg1: string | number, arg2: JonTrainSoundConfig | number, arg3?: number) {
		if (typeof arg1 == "string") {
			this.register(defaultTrainType.toString(), defaultTrainType.baseTrainType, null, null, models, 0, 0, 0, arg1, arg2 as JonTrainSoundConfig);
		} else {
			this.register(defaultTrainType.toString(), defaultTrainType.baseTrainType, null, null, models, arg1 as number, arg2 as number, arg3!, null, new JonTrainSoundConfig(null, 0, 0.5, false));
		}
	}

	public static reset(): void {
		this.REGISTRY.clear();
		this.KEY_ORDERS.clear();

		this.register2(TrainType.C_TRAIN_MINI, new TrainModels(["mts:c_train_mini_1", "mts:c_train_mini_2", "mts:c_train_mini_3"]), "c_train", new JonTrainSoundConfig("sp1900", 69, 0.5, false));
	}

	public static getTrainProperties(key: string): TrainProperties;
	public static getTrainProperties(transportMode: TransportMode, index: number): TrainProperties;


	public static getTrainProperties(arg1: string | TransportMode, arg2?: number) {
		if (typeof arg1 == "string") {
			const keyLower = arg1.toLowerCase();
			return this.REGISTRY.get(keyLower) ?? TrainProperties.getBlankProperties();
		} else {
			arg2 = ~~arg2!;
			return arg2 >= 0 && arg2 < this.KEY_ORDERS.get(arg1)!.length ? this.REGISTRY.get(this.KEY_ORDERS.get(arg1)![arg2]) : TrainProperties.getBlankProperties();
		}
	}

	public static getTrainId(transportMode: TransportMode, index: number) {
		index = ~~index;
		return this.KEY_ORDERS.get(transportMode)![index >= 0 && index < this.KEY_ORDERS.get(transportMode)!.length ? index : 0];
	}

	public static forEach(transportMode: TransportMode, biConsumer: (param1: string, param2: TrainProperties | undefined) => void): void {
		this.KEY_ORDERS.get(transportMode)!.forEach(key => biConsumer(key, this.REGISTRY.get(key)));
	}
}
