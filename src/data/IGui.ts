import { UIRawMessage } from "@minecraft/server-ui";

export namespace IGui {

	export function formatStationName(name: string) {
		return name.replace('|', ' ');
	}

	export function textOrUntitled(text: string): UIRawMessage {
		return text.length == 0 ? { translate: "gui.mts.untitled" } : { text: text };
	}
}