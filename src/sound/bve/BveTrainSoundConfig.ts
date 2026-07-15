import { world } from "@minecraft/server";
import { ConfigFile } from "./ConfigFile";
import { MotorData4 } from "./MotorData4";
import { MotorDataBase } from "./MotorDataBase";
import { MotorData5 } from "./MotorData5";
import { CustomResources } from "extensions/CustomResources";

export class BveTrainSoundConfig {

	public readonly baseName: string;
	public readonly audioBaseName: string;
	public readonly soundCfg: ConfigFile;
	public readonly motorData: MotorDataBase;

	// mts:sounds/c train/sound.cfg       c_train.lopping
	public constructor(baseName: string) {
		this.baseName = baseName;
		const configBaseName = "mts:sounds/" + baseName;
		this.audioBaseName = baseName.replaceAll(" ", "_") + ".";
		this.soundCfg = new ConfigFile(BveTrainSoundConfig.readResource(configBaseName + "/sound.cfg"), this);
		if (this.soundCfg.motorNoiseDataType == 4) {
			this.motorData = new MotorData4(configBaseName);
		} else {
			this.motorData = new MotorData5(configBaseName);
		}
	}

	public static readResource(objectiveId: string): string {
		const objective = CustomResources.getCustomResourceScoreboard(objectiveId);
		return objective !== undefined ? objective.displayName : "";
	}
}
