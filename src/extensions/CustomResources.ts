import { system, world } from "@minecraft/server";
import { ICustomResources } from "./ICustomResources";
import { TrainModels } from "./TrainModels";
import { TrainRegistry } from "./TrainRegistry";
import { JonTrainSound, JonTrainSoundConfig } from "sound/JonTrainSound.";
import { BveTrainSound } from "sound/bve/BveTrainSound";

export class CustomResources {

    public static readonly REGISTRY_SCROREBOARD_OBJECTIVE_ID = "mts_custom_resources";

    private static readonly CUSTOM_TRAIN_ID_PREFIX = "mts_custom_train_"
    private static readonly EXISTING_CUSTOM_RES_SCOREBOARD = new Set<string>();

    static {
        system.beforeEvents.shutdown.subscribe(() => {
            this.EXISTING_CUSTOM_RES_SCOREBOARD.forEach(objectiveId => {
                world.scoreboard.removeObjective(objectiveId);
            })
        })
    }

    public static reload(): void {
		TrainRegistry.reset();
		const customTrains = new Array<string>();

        try {
            const objective = this.getCustomResourceScoreboard(this.REGISTRY_SCROREBOARD_OBJECTIVE_ID);
            if (objective !== undefined)
            {
                Object.entries((JSON.parse(objective.displayName) as ICustomResources).custom_trains).forEach(([entryKey, jsonObject]) => {
                    const name = jsonObject.name ?? entryKey;
                    const trainId = this.CUSTOM_TRAIN_ID_PREFIX + entryKey;

                    const baseTrainType = jsonObject.base_train_type ?? "";
                    const baseTrainProperties = TrainRegistry.getTrainProperties(baseTrainType)
                    const description = jsonObject.description ?? baseTrainProperties.description;

                    const jonSoundOrDefault = baseTrainProperties.sound instanceof JonTrainSound ? baseTrainProperties.sound : new JonTrainSound("", new JonTrainSoundConfig(null, 0, 0.5, false, false));
                    const baseBveSoundBaseId = baseTrainProperties.sound instanceof BveTrainSound ? baseTrainProperties.sound.config.baseName : "";
                    const models = new TrainModels(jsonObject.entity_ids ?? []);

                    const riderOffset = jsonObject.rider_offset ?? baseTrainProperties.riderOffset;
                    const bveSoundBaseId = jsonObject.bve_sound_base_id ?? baseBveSoundBaseId;
                    const speedSoundCount = jsonObject.speed_sound_count ?? jonSoundOrDefault.config.speedSoundCount;
                    const speedSoundBaseId = jsonObject.speed_sound_base_id ?? jonSoundOrDefault.soundId;
                    const doorSoundBaseId = jsonObject.door_sound_base_id ?? jonSoundOrDefault.config.doorSoundBaseId;
                    const doorCloseSoundTime = jsonObject.door_close_sound_time ?? jonSoundOrDefault.config.doorCloseSoundTime;
                    const accelSoundAtCoast = jsonObject.accel_sound_at_coast ?? jonSoundOrDefault.config.useAccelerationSoundsWhenCoasting;
                    const constPlaybackSpeed = jsonObject.const_playback_speed ?? jonSoundOrDefault.config.constantPlaybackSpeed;

                    let useBveSound: boolean;
                    if (bveSoundBaseId == "") {
                        useBveSound = false
                    } else {
                        if (jsonObject.bve_sound_base_id !== undefined) {
                            useBveSound = true
                        } else if (jsonObject.speed_sound_base_id !== undefined) {
                            useBveSound = false
                        } else {
                            useBveSound = baseTrainProperties.sound instanceof BveTrainSound;
                        }
                    }

                    if (baseTrainProperties.baseTrainType != "") {
                        const soundBaseId = useBveSound ? bveSoundBaseId : speedSoundBaseId;
                        const soundConfig = useBveSound ? null : new JonTrainSoundConfig(doorSoundBaseId, speedSoundCount, doorCloseSoundTime, accelSoundAtCoast, constPlaybackSpeed);
                        TrainRegistry.register(trainId, baseTrainType, name, description, models, riderOffset, riderOffset, baseTrainProperties.bogiePosition, soundBaseId, soundConfig);
                        customTrains.push(trainId);
                    }

                    if (jsonObject.model_properties !== undefined) {
                        const jsonProperties = jsonObject.model_properties;
                        const newBaseTrainType = `${jsonProperties.transport_mode}_${~~jsonProperties.length}_${~~jsonProperties.width}`;

                        // TODO temporary code for backwards compatibility
                        const newBaseTrainType2 = baseTrainType.startsWith("base_") ? baseTrainType.replace("base_", "train_") : newBaseTrainType;
                        // TODO temporary code end

                        const soundBaseId = useBveSound ? bveSoundBaseId : speedSoundBaseId;
                        const soundConfig = useBveSound ? null : new JonTrainSoundConfig(doorSoundBaseId, speedSoundCount, doorCloseSoundTime, accelSoundAtCoast, constPlaybackSpeed);
                        TrainRegistry.register(trainId, newBaseTrainType2.toLowerCase(), name, description, models, riderOffset, riderOffset, baseTrainProperties.bogiePosition, soundBaseId, soundConfig);
                        customTrains.push(trainId);
                    }
                });
            }
        } catch (e) {
            console.error(e)
        }

		console.log("Loaded " + customTrains.length + " custom train(s)");
		customTrains.forEach(v => console.log(v));
    }

    public static getCustomResourceScoreboard(objectiveId: string) {
        const objective = world.scoreboard.getObjective(objectiveId);
        if (objective !== undefined) {
            this.EXISTING_CUSTOM_RES_SCOREBOARD.add(objectiveId)
        }
        return objective;
    }
}
