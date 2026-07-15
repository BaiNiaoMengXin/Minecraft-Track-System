export class TrainModels {

	private readonly entityIds: string[] | null;

	public constructor(entityIds: string[] | null) {
		this.entityIds = entityIds;
	}

	public getModelFormIndex(trainCars: number, index: number) {
		if (this.entityIds !== null && trainCars >= 1) {
			if (this.entityIds.length == 1) {
				return this.entityIds[0];
			} else if (this.entityIds.length == 2) {
				return this.entityIds[Math.min(index, 1)]
			}

			let array: string[];
			const end = this.entityIds[this.entityIds.length - 1];
			const start = this.entityIds[0];
			if (trainCars == 1) {
				array = [this.entityIds[1]]
			} else if (trainCars == 2) {
				array = [start, end]
			} else {
				array = [start]
				for (let i = 0; i < trainCars - 2; i++) {
					array.push(this.entityIds[1 + (i % (this.entityIds.length - 2))])
				}
				array.push(end);
			}
			index = Math.max(Math.min(trainCars - 1, index), 0);
			return array[index]
		} else {
			return null;
		}
	}
}
