import { NameColorDataBase } from "./NameColorDataBase";
import { UUID } from "jLib/UUID";
import { ArrayList } from "jLib/ArrayList";
import { DyeColor } from "util/DyeColor";
import { BetterMap } from "./BetterMap";
import { MessagePackHelper } from "./MessagePackHelper";


export class SignalBlocks {

	private readonly railToSignalBlocks = new BetterMap<UUID, Array<SignalBlock>>;
	public readonly signalBlocks = new ArrayList<SignalBlock>();

	public add(id: number, color: DyeColor, rail: UUID): number {
		const connectedSignalBlocks = new ArrayList<SignalBlock>();
		this.signalBlocks.forEach(signalBlock => {
			if (signalBlock.dyeColor == color && signalBlock.isConnected(rail)) {
				connectedSignalBlocks.push(signalBlock);
			}
		});

		if (connectedSignalBlocks.isEmpty()) {
			const newSignalBlock = new SignalBlock(id, color, rail);
			this.signalBlocks.push(newSignalBlock);
			this.writeCache();
			return newSignalBlock.id;
		} else {
			connectedSignalBlocks.sort();
			const firstSignalBlock = connectedSignalBlocks.remove(0);
			firstSignalBlock.rails.push(rail);
			connectedSignalBlocks.forEach(signalBlock => firstSignalBlock.rails.push(...signalBlock.rails));
			this.signalBlocks.removeIf(item => connectedSignalBlocks.includes(item));
			this.writeCache();
			return 0;
		}
	}

	public remove(id: number, color: DyeColor, rail: UUID): number {
		let connectedSignalBlock = null;
		for (const signalBlock of this.signalBlocks) {
			if (signalBlock.dyeColor == color && signalBlock.isConnected(rail)) {
				connectedSignalBlock = signalBlock;
				break;
			}
		}

		if (connectedSignalBlock != null) {
			this.signalBlocks.remove(connectedSignalBlock);
			connectedSignalBlock.rails.remove(rail);

			if (!connectedSignalBlock.rails.isEmpty()) {
				const rails = new ArrayList<UUID>(...connectedSignalBlock.rails);
				rails.sort();
				this.add(connectedSignalBlock.id, color, rails.remove(0));

				let returnId = 0;
				for (const existingRail of rails) {
					const newId = this.add(id, color, existingRail);
					if (newId != connectedSignalBlock.id) {
						returnId = newId;
					}
				}

				this.writeCache();
				return returnId;
			}
		}

		this.writeCache();
		return 0;
	}

	public occupy(currentRail: UUID, trainPositions: Array<BetterMap<UUID, number>>, trainId: number): void {
		if (trainPositions.length < 2) {
			return;
		}

		const railsToAdd = new ArrayList<UUID>();
		railsToAdd.push(currentRail);

		if (this.railToSignalBlocks.has(currentRail)) {
			this.railToSignalBlocks.get(currentRail)!.forEach(signalBlock => {
				railsToAdd.push(...signalBlock.rails);
				signalBlock.occupied = 2;
			});
		}

		for (const trainPositionsMap of trainPositions) {
			if (railsToAdd.some(rail => trainPositionsMap.has(rail) && trainPositionsMap.get(rail)! != trainId)) {
				return;
			}
		}

		railsToAdd.forEach(rail => trainPositions[1].set(rail, trainId));
	}

	public resetOccupied(): void {
		this.signalBlocks.forEach(signalBlock => {
			if (signalBlock.isOccupied()) {
				signalBlock.occupied--;
			}
		});
	}

	public getSignalBlocksAtTrack(rail: UUID): SignalBlock[] {
		if (this.railToSignalBlocks.has(rail)) {
			const matchingSignalBlocks: SignalBlock[] = new Array(...this.railToSignalBlocks.get(rail)!);
			matchingSignalBlocks.sort((a, b) => a.color - b.color);
			return matchingSignalBlocks;
		} else {
			return [];
		}
	}

	public isOccupied(rail: UUID): boolean {
		if (this.railToSignalBlocks.has(rail)) {
			return this.railToSignalBlocks.get(rail)!.some(item => item.isOccupied());
		} else {
			return false;
		}
	}

	public getSignalBlockStatus(signalBlockStatus: Map<number, boolean>, rail: UUID): void {
		if (this.railToSignalBlocks.has(rail)) {
			this.railToSignalBlocks.get(rail)!.forEach(signalBlock => signalBlockStatus.set(signalBlock.id, signalBlock.isOccupied()));
		}
	}

	public writeSignalBlockStatus(signalBlockStatus: Map<number, boolean>): void {
		signalBlockStatus.forEach((occupied, id) => this.signalBlocks.forEach(signalBlock => {
			if (signalBlock.id == id) {
				signalBlock.occupied = occupied ? 2 : 0;
			}
		}));
	}

	public writeCache(): void {
		this.railToSignalBlocks.clear();
		this.signalBlocks.forEach(signalBlock => signalBlock.rails.forEach(rail => {
			if (!this.railToSignalBlocks.has(rail)) {
				this.railToSignalBlocks.set(rail, []);
			}
			this.railToSignalBlocks.get(rail)!.push(signalBlock);
		}));
	}
}


export class SignalBlock extends NameColorDataBase {

    public readonly dyeColor: DyeColor;
    public readonly rails: ArrayList<UUID> = new ArrayList();
    public occupied: number = 0;

    public constructor(id: number, color: DyeColor, rail: UUID);

    public constructor(map: Record<string, unknown>);

    public constructor(arg1: number | Record<string, unknown>, color?: DyeColor, rail?: UUID) {
        if (color != undefined) {
			super(arg1 as number);
            this.dyeColor = color;
            this.rails.push(rail!);
        } else {
			super(arg1 as Record<string, unknown>);
			const messagePackHelper = new MessagePackHelper(arg1 as ReturnType<this['toMessagePack']>);

			this.dyeColor = DyeColor.values()[messagePackHelper.getInt("color")];
            messagePackHelper.iterateArrayValue("rails", value => this.rails.push(UUID.fromString(value.asString())));
        }
    }

    public override toMessagePack() {
        return {
            ...super.toMessagePack(),

            color: this.dyeColor.ordinal(),
            rails: Array.from(this.rails, rail => rail.toString())
        } as const;
    }

    protected override hasTransportMode(): boolean {
        return false;
    }

    public isOccupied(): boolean {
        return this.occupied > 0;
    }

    public isConnected(checkRail: UUID): boolean {
        const checkPos1 = checkRail.getLeastSignificantBits();
        const checkPos2 = checkRail.getMostSignificantBits();
        return this.rails.some(rail => {
            const pos1 = rail.getLeastSignificantBits();
            const pos2 = rail.getMostSignificantBits();
            return checkPos1 == pos1 || checkPos1 == pos2 || checkPos2 == pos1 || checkPos2 == pos2;
        });
    }

    public override compareTo(compare: NameColorDataBase): number {
        return this.id - compare.id;
    }
}