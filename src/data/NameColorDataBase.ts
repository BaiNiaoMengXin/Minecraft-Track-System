import { TransportMode } from "./TransportMode";
import { SavedRailBase } from "./SavedRailBase";
import { SerializedDataBase } from "./SerializedDataBase";
import { generateUniqueNumberID } from "./Base";
import { Comparable } from "jLib/Comparable";
import { MessagePackHelper } from "./MessagePackHelper";

export abstract class NameColorDataBase extends SerializedDataBase implements Comparable<NameColorDataBase> {
    public readonly id: number;
    public readonly transportMode: TransportMode;
    public name: string;
    public color: number = 0;

    public constructor();

    public constructor(id: number);

    public constructor(transportMode: TransportMode);

    public constructor(id: number, transportMode: TransportMode);

    public constructor(map: Record<string, unknown>);

    public constructor(arg1?: number | TransportMode | Record<string, unknown>, transportMode?: TransportMode) {
        super()
        if (arg1 != undefined && typeof arg1 !== "number" && !(arg1 instanceof TransportMode)) {
            const messagePackHelper = new MessagePackHelper(arg1 as ReturnType<this['toMessagePack']>);
            
            this.id = messagePackHelper.getDouble("id");
            this.transportMode = TransportMode.fromString(messagePackHelper.getString("transport_mode"));
            this.name = messagePackHelper.getString("name").replace(" |", "|").replace("| ", "|");
            this.color = messagePackHelper.getInt("color");
        } else {
            let id = 0;
            let mode: TransportMode = TransportMode.TRAIN;

            if (arg1 == undefined) {
                id = 0;
            } else if (typeof arg1 === 'number') {
                id = arg1;
                if (transportMode !== undefined) {
                    mode = transportMode;
                }
            } else {
                mode = arg1;
            }
            this.id = id === 0 ? generateUniqueNumberID() : id;
            this.transportMode = mode;
            this.name = "";
        }
    }

    public override toMessagePack() {
        return {
            id: this.id,
            transport_mode: this.transportMode.toString(),
            name: this.name,
            color: this.color
        } as const;
    }

    public isTransportMode(transportMode: TransportMode): boolean {
		return !this.hasTransportMode() || this.transportMode == transportMode;
	}

	protected abstract hasTransportMode(): boolean;

    public compareTo(compare: NameColorDataBase): number {
        return (this.name.toLowerCase() + this.color).localeCompare((compare.name + compare.color).toLowerCase());
    }
}