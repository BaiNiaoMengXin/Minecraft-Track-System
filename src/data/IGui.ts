import { UIRawMessage } from "@minecraft/server-ui";
import { Station } from "./Station";
import { RawMessage } from "@minecraft/server";

export namespace IGui {

	export function formatStationName(name: string) {
		return name.replace('|', ' ');
	}

	export function textOrUntitled(text: string): UIRawMessage {
		return text.length == 0 ? { translate: "gui.mts.untitled" } : { text: text };
	}

	export function mergeStationsWithCommas(stations: string[]): RawMessage	{
		const combinedCJK: Array<Array<string>> = [];

		for (const station of stations) {
			const stationSplit = station.split(/\|/);
			const currentStationCJK: string[] = [];

			for (const stationSplitPart of stationSplit) {
				currentStationCJK.push(stationSplitPart);
			}

			for (let i = 0; i < currentStationCJK.length; i++) {
				if (i < combinedCJK.length) {
					if (!combinedCJK[i].includes(currentStationCJK[i])) {
						combinedCJK[i].push(currentStationCJK[i]);
					}
				} else {
					const arr: string[] = [];
					arr.push(currentStationCJK[i]);
					combinedCJK.push(arr);
				}
			}
		}

		const flattened: RawMessage[] = [];
		const spliceRawMsg: RawMessage = { text: "|" };
		for (let i = 0; i < combinedCJK.length; i++) {
			const subList = combinedCJK[i];
			const listSize = subList.length;
			for (let j = 0; j < listSize; j++) {
				flattened.push({ text: subList[j] });
				if (j <= listSize - 2) {
					if (listSize > 2) {
						flattened.push({ translate: "gui.mts.comma_cjk" });
					}
					if (j == listSize - 2) {
						flattened.push({ translate: "gui.mts.comma_last_cjk" });
					}
				}
			}
			
			if (i < combinedCJK.length - 1) {
				flattened.push(spliceRawMsg);
			}
		}

		return {
			rawtext: flattened
		};
	}

	/**
	 * @todo
	 * 
	 * @param stations 
	 * @returns 
	 */
	export function mergeStationsWithCommasRawMsg(stations: RawMessage[]): RawMessage	{
		const combinedCJK: Array<Array<RawMessage>> = [];


		const currentStationCJK: RawMessage[] = stations;

		for (let i = 0; i < currentStationCJK.length; i++) {
			if (i < combinedCJK.length) {
				if (!combinedCJK[i].includes(currentStationCJK[i])) {
					combinedCJK[i].push(currentStationCJK[i]);
				}
			} else {
				const arr: RawMessage[] = [];
				arr.push(currentStationCJK[i]);
				combinedCJK.push(arr);
			}
		}

		const flattened: RawMessage[] = [];
		const spliceRawMsg: RawMessage = { text: "|" };
		for (let i = 0; i < combinedCJK.length; i++) {
			const subList = combinedCJK[i];
			const listSize = subList.length;
			for (let j = 0; j < listSize; j++) {
				flattened.push(subList[j]);
				if (j <= listSize - 2) {
					if (listSize > 2) {
						flattened.push({ translate: "gui.mts.comma_cjk" });
					}
					if (j == listSize - 2) {
						flattened.push({ translate: "gui.mts.comma_last_cjk" });
					}
				}
			}
			
			if (i < combinedCJK.length - 1) {
				flattened.push(spliceRawMsg);
			}
		}

		return {
			rawtext: flattened
		};
	}
}