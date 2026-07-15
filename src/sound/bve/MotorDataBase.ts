
export abstract class MotorDataBase {

	public abstract getSoundCount(): number;
	
	public abstract getPitch(index: number, speed: number, accel: number): number;
	
	public abstract getVolume(index: number, speed: number, accel: number): number;
	
}
