import { currentTimeMillis } from "./Base";

export class TrainDelay {

	private currentDelayCounter: number = 0;
	private delayTicks: number = 0;
	private lastDelayTime: number = 0;

	private static readonly CURRENT_DELAY_RESET_MILLIS: number = 1000;
	private static readonly TOTAL_DELAY_RESET_MILLIS: number = 300000;

	public delaying(): void {
		const millis = currentTimeMillis();
		if (millis - this.lastDelayTime > TrainDelay.CURRENT_DELAY_RESET_MILLIS) {
			this.currentDelayCounter = 0;
		}
		if (millis - this.lastDelayTime > TrainDelay.TOTAL_DELAY_RESET_MILLIS) {
			this.delayTicks = this.currentDelayCounter;
		}

		this.currentDelayCounter++;
		this.delayTicks = Math.max(this.currentDelayCounter, this.delayTicks);
		this.lastDelayTime = millis;
	}

	public getDelayTicks(): number {
		return this.delayTicks;
	}

	public getLastDelayTime(): number {
		return this.lastDelayTime;
	}

	public isExpired(): boolean {
		return currentTimeMillis() - this.lastDelayTime > TrainDelay.TOTAL_DELAY_RESET_MILLIS + TrainDelay.CURRENT_DELAY_RESET_MILLIS;
	}
}
