import { Comparable } from "jLib/Comparable";

export class ScheduleEntry implements Comparable<ScheduleEntry> {

	public readonly arrivalMillis: number;
	public readonly trainCars: number;
	public readonly routeId: number;
	public readonly currentStationIndex: number;

	public constructor(arrivalMillis: number, trainCars: number, routeId: number, currentStationIndex: number) {
		this.arrivalMillis = arrivalMillis;
		this.trainCars = trainCars;
		this.routeId = routeId;
		this.currentStationIndex = currentStationIndex;
	}

	public compareTo(o: ScheduleEntry): number {
		if (this.arrivalMillis == o.arrivalMillis) {
			return this.routeId > o.routeId ? 1 : -1;
		} else {
			return this.arrivalMillis > o.arrivalMillis ? 1 : -1;
		}
	}
}
