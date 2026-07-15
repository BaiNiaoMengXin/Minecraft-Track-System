import { Vector3 } from "@minecraft/server";
import { Train } from "data/Train"

export abstract class TrainSoundBase {

	public abstract createTrainInstance(train: Train): TrainSoundBase;

	public abstract playNearestCar(pos: Vector3, carIndex: number): void;

	public abstract playAllCars(pos: Vector3, carIndex: number): void;

	public abstract playAllCarsDoorOpening(pos: Vector3, carIndex: number): void;
}
