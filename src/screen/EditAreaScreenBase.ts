import { debugDrawer, DebugLine } from "@minecraft/debug-utilities";
import { Player, system, VectorXZ, world } from "@minecraft/server";
import { AreaBase } from "data/AreaBase";
import { EditNameColorScreenBase } from "./EditNameColorScreenBase";
import { DashboardScreen } from "./DashboardScreen";

export abstract class EditAreaScreenBase<T extends AreaBase> extends EditNameColorScreenBase<T> {

	public selectedCornnerStart: boolean = false;

	public tempCornerStart: VectorXZ | null = null;
	public tempCornerEnd: VectorXZ | null = null;

	private _runIntervalId: number = -1;

	public constructor(data: T, dashboardScreen: DashboardScreen, nameKey: string, onCloseCallback: () => void) {
		super(data, dashboardScreen, nameKey, onCloseCallback);

		this.customForm.button({ translate: "gui.mts.edit_area" }, () => this.startEditingArea());
		if (!dashboardScreen.isNew) {
			const center = data.getCenter();
			if (center) {
				this.customForm.label({ translate: "gui.mts.locate_pos", with: [`x: ${center.getX()}, z: ${center.getZ()}`] }).spacer();
			}
		}
	}

	private startEditingArea(): void {
		this.customForm.close();
		this.dashboardScreen.isOnAwait = true;

		const callback = world.afterEvents.itemUse.subscribe(event => {
			if (event.source.id === this.dashboardScreen.player.id && event.itemStack && event.itemStack.typeId === this.dashboardScreen.itemTypeId) {
				if (!this.selectedCornnerStart) {
					this.selectedCornnerStart = true;
				} else {
					this.saveData();
					this.show();
					system.clearRun(this._runIntervalId);
					this._runIntervalId = -1;
					this.dashboardScreen.isOnAwait = false
					this.selectedCornnerStart = false;
					this.tempCornerEnd = null;
					this.tempCornerStart = null;
					world.afterEvents.itemUse.unsubscribe(callback);
				}
			}
		});
		this._runIntervalId = system.runInterval(() => this._tick(), 4);
	}

	private _tick() {
		const playerY = this.dashboardScreen.player.location.y;

		if (!this.selectedCornnerStart) {
			this.tempCornerStart = EditAreaScreenBase.getCornerFromViewDirection(this.dashboardScreen.player);
		} else {
			this.tempCornerEnd = EditAreaScreenBase.getCornerFromViewDirection(this.dashboardScreen.player);
		}

		const color = { red: 1, green: 1, blue: 1, alpha: 1 }

		const lineStart = new DebugLine({ x: this.tempCornerStart!.x + 0.5, y: playerY - 32, z: this.tempCornerStart!.z + 0.5 }, { x: this.tempCornerStart!.x + 0.5, y: playerY + 32, z: this.tempCornerStart!.z + 0.5 })
		lineStart.color = color
		lineStart.timeLeft = 0.2
		debugDrawer.addShape(lineStart)

		if (this.selectedCornnerStart) {
			const lineEnd = new DebugLine({ x: this.tempCornerEnd!.x + 0.5, y: playerY - 32, z: this.tempCornerEnd!.z + 0.5 }, { x: this.tempCornerEnd!.x + 0.5, y: playerY + 32, z: this.tempCornerEnd!.z + 0.5 })
			lineEnd.color = color
			lineEnd.timeLeft = 0.2
			debugDrawer.addShape(lineEnd)

			const lineSE = new DebugLine({
				x: this.tempCornerStart!.x + 0.5,
				y: playerY - 32,
				z: this.tempCornerEnd!.z + 0.5
			}, {
				x: this.tempCornerStart!.x + 0.5,
				y: playerY + 32,
				z: this.tempCornerEnd!.z + 0.5
			})
			lineSE.color = color
			lineSE.timeLeft = 0.2
			debugDrawer.addShape(lineSE)

			const lineES = new DebugLine({
				x: this.tempCornerEnd!.x + 0.5,
				y: playerY - 32,
				z: this.tempCornerStart!.z + 0.5
			}, {
				x: this.tempCornerEnd!.x + 0.5,
				y: playerY + 32,
				z: this.tempCornerStart!.z + 0.5
			})
			lineES.color = color
			lineES.timeLeft = 0.2
			debugDrawer.addShape(lineES)
		}
	}

	protected override saveData(): void {
		super.saveData();
		if (this.tempCornerStart && this.tempCornerEnd) {
			this.data.setCorners(this.tempCornerStart.x, this.tempCornerStart.z, this.tempCornerEnd.x, this.tempCornerEnd.z);
		}
	}

	private static getCornerFromViewDirection(player: Player): VectorXZ {
		const playerY = player.location.y;

		const block = player.getBlockFromViewDirection({ maxDistance: 10 })?.block;
		if (!block || block?.isAir) {
			const headLoc = player.getHeadLocation();
			const viewDirection = player.getViewDirection();
			const distance = 10;
			return {
				x: ~~Math.ceil(headLoc.x + viewDirection.x * distance) - 1,
				z: ~~Math.ceil(headLoc.z + viewDirection.z * distance) - 1
			};
		}
		else {
			return block.location;
		}
	}
}
