import { EntityComponentTypes, Player, system } from "@minecraft/server";
import { CustomForm, ObservableBoolean, ObservableUIRawMessage } from "@minecraft/server-ui";
import { TicketSystem } from "data/TicketSystem";

export class TicketMachineScreen {

	private customForm: CustomForm

	private readonly runId: number;

	private static readonly BUTTON_COUNT = 10;

	private readonly buttonsDisbled = new Array<ObservableBoolean>(TicketMachineScreen.BUTTON_COUNT);
	private readonly balanceText = new ObservableUIRawMessage({});
	private readonly emeraldsText = new ObservableUIRawMessage({});

	private static readonly EMERALD_TO_DOLLAR = 10;

	public constructor(player: Player) {
		this.customForm = new CustomForm(player, "").closeButton();

		this.customForm.label(this.balanceText)
		this.customForm.spacer();
		this.customForm.label(this.emeraldsText)

		for (let i = 0; i < TicketMachineScreen.BUTTON_COUNT; i++) {
			this.buttonsDisbled[i] = new ObservableBoolean(true);
		}

		TicketSystem.addObjectivesIfMissing();

		this.tick(player);
		this.runId = system.runInterval(() => this.tick(player));

		this.customForm.spacer().spacer();

		for (let i = 0; i < TicketMachineScreen.BUTTON_COUNT; i++) {
			this.customForm.label({
				translate: "gui.mts.add_balance_for_emeralds",
				with: [
					String(TicketMachineScreen.getAddAmount(i)),
					String(~~Math.pow(2, i))
				]
			});
			this.customForm.button({ translate: "gui.mts.add_value" }, () => {
				const addAmount = TicketMachineScreen.getAddAmount(i)
				const emeralds = ~~Math.pow(2, i);
				const balanceScore = TicketSystem.getPlayerScore(player, TicketSystem.BALANCE_OBJECTIVE);
				balanceScore?.setScore(balanceScore.getScore() + addAmount);

				/*const inventory = player.getComponent(EntityComponentTypes.Inventory);
				if (inventory != undefined) {
					let count = emeralds;

					for (let i = 0; i < inventory.inventorySize; i++) {
						if (count == 0) {
							break;
						} else {
							const item = inventory.container.getItem(i);
							if (item && item.typeId == "minecraft:emerald") {
								const count2 = Math.min(count, item.amount);
								const newAmount = item.amount - count2;
								if (newAmount != 0) {
									item.amount = newAmount;
								} else {
									inventory.container.setItem(i);
								}
								count -= count2;
							}
						}
					}
				}*/
				player.runCommand(`clear @s minecraft:emerald 0 ${emeralds}`)
				player.dimension.playSound("random.orb", player.location);
				this.tick(player);
			}, {
				disabled: this.buttonsDisbled[i]
			});
		}
	}

	public show() {
		this.customForm.show().then(() => system.clearRun(this.runId));
	}

	private tick(player: Player) {
		const emeraldCount = TicketMachineScreen.getEmeraldCount(player);
		
		this.balanceText.setData({
			translate: "gui.mts.balance",
			with: [ String(TicketSystem.getPlayerScore(player, TicketSystem.BALANCE_OBJECTIVE)?.getScore()) ]
		})
		this.emeraldsText.setData({
			translate: "gui.mts.emeralds",
			with: [ String(emeraldCount) ]
		})

		for (let i = 0; i < TicketMachineScreen.BUTTON_COUNT; i++) {
			this.buttonsDisbled[i].setData(emeraldCount < Math.pow(2, i));
		}
	}

	private static getEmeraldCount(player: Player) {
		const inventory = player.getComponent(EntityComponentTypes.Inventory);
		if (inventory != undefined) {
			let count = 0
			for (let i = 0; i < inventory.inventorySize; i++) {
				const item = inventory.container.getItem(i);
				if (item && item.typeId == "minecraft:emerald") {
					count += item.amount;
				}
			}
			return count;
		} else {
			return 0;
		}
	}

	private static getAddAmount(index: number) {
		return Math.ceil(Math.pow(2, index) * (this.EMERALD_TO_DOLLAR + index));
	}
}
