import { AreaBase } from "./AreaBase";
import { MessagePackHelper } from "./MessagePackHelper";

export class Station extends AreaBase {

	public zone: number = 0;
	public readonly exits: Map<string, Array<string>> = new Map();

	public constructor();

	public constructor(id: number);

	public constructor(map: Record<string, unknown>);

    public constructor(arg1?: number | Record<string, unknown>) {
        if (!arg1) {
            super()
        } else if (typeof arg1 == "number") {
            super(arg1);
        } else {
			super(arg1 as Record<string, unknown>);
			const messagePackHelper = new MessagePackHelper(arg1 as ReturnType<this['toMessagePack']>);
            this.zone = messagePackHelper.getInt("zone");

            messagePackHelper.iterateMapValue("exits", (entryKey, entryValue) => {
                const destinations = new Array<string>(entryValue.asArrayValue().length);
                for (const destination of entryValue.asArrayValue()) {
					// TODO temporary code
                    destinations.push(destination as string);
					// TODO temporary code end
                }
                this.exits.set(entryKey, destinations);
            });
        }
    }

	public override toMessagePack() {
        return {
            ...super.toMessagePack(),

            zone: this.zone,
            exits: MessagePackHelper.convertStringMap(this.exits)
        } as const;
	}

	protected override hasTransportMode(): boolean {
		return false;
	}

	public getGeneratedExits(): Map<string, Array<string>> {
		const exitParents = new Array<string>(...this.exits.keys());
		exitParents.sort((a, b) => a.localeCompare(b));

		const generatedExits = new Map<string, Array<string>>();
		exitParents.forEach(parent => {
			const exitLetter = parent.substring(0, 1);
			if (!generatedExits.has(exitLetter)) {
				generatedExits.set(exitLetter, new Array());
			}

			generatedExits.get(exitLetter)!.push(...this.exits.get(parent)!);
			generatedExits.set(parent, this.exits.get(parent)!);
		});

		return generatedExits;
	}

	private setExitParent(oldParent: string, newParent: string): void {
		if (this.parentExists(oldParent)) {
			const existingDestinations = this.exits.get(oldParent);
			this.exits.delete(oldParent);
			this.exits.set(newParent, existingDestinations == null ? new Array() : existingDestinations);
		} else {
			this.exits.set(newParent, new Array());
		}
	}

	private parentExists(parent: string): boolean {
		return parent != null && this.exits.has(parent);
	}

    public static serializeExit(exit: string): bigint {
		const characters = exit;
		let code = 0n;
		for (const character of characters) {
			code = code << 8n;
			code += BigInt(character.charCodeAt(0));
		}
		return code;
	}

	public static deserializeExit(code: bigint): string {
		let exit = "";
		let charCodes = code;
		while (charCodes > 0) {
			exit = String.fromCharCode(Number(charCodes & 0xFFn)) + exit;
			charCodes = charCodes >> 8n;
		}
		return exit.toString();
	}
}
