import { BetterMap } from "data/BetterMap";
import { PathData } from "./PathData";
import { BlockPos } from "util/math/BlockPos";
import { Rail } from "data/Rail";
import { SavedRailBase } from "data/SavedRailBase";
import { TransportMode } from "data/TransportMode";
import { RailType } from "data/RailType";
import { RailAngle } from "data/RailAngle";
import { DataCache } from "data/DataCache";
import { RailwayData } from "data/RailwayData";
import { Mth } from "util/math/Mth";
import { Platform } from "data/Platform";
import { Vec3 } from "util/math/Vec3";

export class PathFinder {

	private static readonly MAX_AIRPLANE_TURN_ARC = 128;

	public static findPath(path: Array<PathData>, rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, savedRailBases: Array<SavedRailBase>, stopIndexOffset: number, cruisingAltitude: number, useFastSpeed: boolean): number {
		path.length = 0;
		if (savedRailBases.length < 2) {
			return 0;
		}

		for (let i = 0; i < savedRailBases.length - 1; i++) {
			const savedRailBaseStart = savedRailBases[i];
			const savedRailBaseEnd = savedRailBases[i + 1];

			const runways = new Set<BlockPos>();
			if (savedRailBaseStart.transportMode == TransportMode.AIRPLANE) {
				rails.forEach((railMap, startPos) => {
					if (railMap.size == 1 && Array.from(railMap.values()).every(rail => rail.railType == RailType.RUNWAY)) {
						runways.add(startPos);
					}
				});
			}

			const partialPath = this.findPartialPath(rails, runways, savedRailBaseStart, savedRailBaseEnd, i + stopIndexOffset, cruisingAltitude, useFastSpeed);
			if (partialPath.length == 0) {
				path.length = 0;
				return i + 1;
			}

			this.appendPath(path, partialPath);
		}

		return savedRailBases.length;
	}

	public static appendPath(path: Array<PathData>, partialPath: Array<PathData>): void {
		if (partialPath.length == 0) {
			path.length = 0;
		} else {
			const sameFirstRail = path.length > 0 && path[path.length - 1].isSameRail(partialPath[0]);
			for (let j = 0; j < partialPath.length; j++) {
				if (!(j == 0 && sameFirstRail)) {
					path.push(partialPath[j]);
				}
			}
		}
	}

	private static findPartialPath(rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, runways: Set<BlockPos>, savedRailBaseStart: SavedRailBase, savedRailBaseEnd: SavedRailBase, stopIndex: number, cruisingAltitude: number, useFastSpeed: boolean): Array<PathData> {
		const savedRailBaseEndMidPos = savedRailBaseEnd.getMidPos();
		const comparator = (newConnections: BetterMap<BlockPos, Rail>): ((pos1: BlockPos, pos2: BlockPos) => number) => {
			return (pos1, pos2) => {
				if (pos1 == pos2) {
					return 0;
				} else {
					const connection1 = newConnections.get(pos1);
					const connection2 = newConnections.get(pos2);
					if (!connection1 || !connection2 || connection1.railType.speedLimit == connection2.railType.speedLimit) {
						return pos1.distSqr(savedRailBaseEndMidPos) > pos2.distSqr(savedRailBaseEndMidPos) ? 1 : -1;
					} else {
						return connection2.railType.speedLimit - connection1.railType.speedLimit;
					}
				}
			};
		};

		for (let i = 0; i < 2; i++) {
			const path: Array<PathPart> = [];
			const turnBacks = new Set<BlockPos>();
			const startPositions = savedRailBaseStart.getOrderedPositions(savedRailBaseEndMidPos, i == 0);
			path.push(new PathPart(null, startPositions[0], []));
			this.addPathPart(rails, runways, startPositions[1], startPositions[0], path, turnBacks, comparator);

			while (path.length >= 2) {
				const lastPathPart = path[path.length - 1];

				if (lastPathPart.otherOptions.length == 0) {
					path.pop();
				} else {
					const newPos = lastPathPart.otherOptions.shift()!;
					this.addPathPart(rails, runways, newPos, lastPathPart.pos, path, turnBacks, comparator);

					if (savedRailBaseEnd.containsPos(newPos)) {
						const railPath: Array<PathData> = [];
						for (let j = 0; j < path.length - 1; j++) {
							const pathPart1 = path[j];
							const pathPart2 = path[j + 1];
							const pos1 = pathPart1.pos;
							const pos2 = pathPart2.pos;
							const rail = DataCache.tryGet(rails, pos1, pos2);

							if (rail == null) {
								if (runways.size == 0) {
									return [];
								} else {
									const heightDifference1 = cruisingAltitude - pos1.getY();
									const heightDifference2 = cruisingAltitude - pos2.getY();
									const cruisingPos1 = RailwayData.offsetBlockPos(pos1, pathPart1.direction!.cos * Math.abs(heightDifference1) * 4, heightDifference1, pathPart1.direction!.sin * Math.abs(heightDifference1) * 4);
									const cruisingPos4 = RailwayData.offsetBlockPos(pos2, -pathPart2.direction!.cos * Math.abs(heightDifference2) * 4, heightDifference2, -pathPart2.direction!.sin * Math.abs(heightDifference2) * 4);
									const turnArc = Math.min(PathFinder.MAX_AIRPLANE_TURN_ARC, cruisingPos1.distManhattan(cruisingPos4) / 8);
									const dummyRailType = useFastSpeed ? RailType.AIRPLANE_DUMMY : RailType.RUNWAY;

									railPath.push(new PathData(new Rail(pos1, pathPart1.direction!, cruisingPos1, pathPart1.direction!.getOpposite(), dummyRailType, TransportMode.AIRPLANE), 0, 0, pos1, cruisingPos1, stopIndex));

									const expectedAngle = RailAngle.fromAngle(Mth.toDegrees(Math.atan2(cruisingPos4.getZ() - cruisingPos1.getZ(), cruisingPos4.getX() - cruisingPos1.getX())));
									const cruisingPos2 = this.addAirplanePath(pathPart1.direction!, cruisingPos1, expectedAngle, turnArc, railPath, dummyRailType, stopIndex, false);
									const tempRailData: Array<PathData> = [];
									const cruisingPos3 = this.addAirplanePath(pathPart2.direction!.getOpposite(), cruisingPos4, expectedAngle.getOpposite(), turnArc, tempRailData, dummyRailType, stopIndex, true);

									railPath.push(new PathData(new Rail(cruisingPos2, expectedAngle, cruisingPos3, expectedAngle.getOpposite(), dummyRailType, TransportMode.AIRPLANE), 0, 0, cruisingPos2, cruisingPos3, stopIndex));
									railPath.push(...tempRailData);

									railPath.push(new PathData(new Rail(cruisingPos4, pathPart2.direction!, pos2, pathPart2.direction!.getOpposite(), dummyRailType, TransportMode.AIRPLANE), 0, 0, cruisingPos4, pos2, stopIndex));
								}
							} else {
								const turningBack = rail.railType == RailType.TURN_BACK && j < path.length - 2 && path[j + 2].pos.equals(pos1);
								railPath.push(new PathData(rail, j == 0 ? savedRailBaseStart.id : 0, turningBack ? 1 : 0, pos1, pos2, stopIndex));
							}
						}

						const endPos = savedRailBaseEnd.getOtherPosition(newPos);
						const rail = DataCache.tryGet(rails, newPos, endPos);
						if (rail == null) {
							return [];
						} else {
							railPath.push(new PathData(rail, savedRailBaseEnd.id, savedRailBaseEnd instanceof Platform ? savedRailBaseEnd.getDwellTime() : 0, newPos, endPos, stopIndex + 1));
							return railPath;
						}
					}
				}
			}
		}

		return [];
	}

	private static addPathPart(rails: BetterMap<BlockPos, BetterMap<BlockPos, Rail>>, runways: Set<BlockPos>, newPos: BlockPos, lastPos: BlockPos, path: Array<PathPart>, turnBacks: Set<BlockPos>, comparator: (newConnections: BetterMap<BlockPos, Rail>) => (pos1: BlockPos, pos2: BlockPos) => number): void {
		const newConnections = rails.get(newPos);
		const oldRail = rails.get(lastPos)?.get(newPos);

		if (oldRail == undefined && runways.size == 0) {
			return;
		}

		const newDirection = oldRail == undefined ? (newConnections ? Array.from(newConnections.values())?.[0].facingStart : RailAngle.E) : oldRail.facingEnd.getOpposite();
		const otherOptions: Array<BlockPos> = [];

		if (newConnections) {
			const canTurnBack = oldRail != undefined && oldRail.railType == RailType.TURN_BACK && !turnBacks.has(newPos);
			if (oldRail != undefined && oldRail.railType == RailType.RUNWAY && newConnections.size <= 1) {
				otherOptions.push(...runways);
			} else {
				newConnections.forEach((rail, connectedPos) => {
					if (canTurnBack || (rail.railType != RailType.NONE && rail.facingStart != newDirection.getOpposite() && !path.some(pathPart => pathPart.isSame(newPos, newDirection)))) {
						otherOptions.push(connectedPos);
						if (canTurnBack) {
							turnBacks.add(newPos);
						}
					}
				});
			}
		}

		if (otherOptions.length > 0) {
			otherOptions.sort(comparator(newConnections!));
			path.push(new PathPart(newDirection, newPos, otherOptions));
		}
	}

	private static addAirplanePath(startAngle: RailAngle, startPos: BlockPos, expectedAngle: RailAngle, turnArc: number, tempRailPath: Array<PathData>, railType: RailType, stopIndex: number, reverse: boolean) {
		const angleDifference = expectedAngle.sub(startAngle);
		const turnRight = angleDifference.angleRadians > 0;
		let tempAngle = startAngle;
		let tempPos = startPos;

		for (let i = 0; i < RailAngle.values().length; i++) {
			if (tempAngle == expectedAngle) {
				break;
			}

			const oldTempAngle = tempAngle;
			const oldTempPos = tempPos;
			const rotateAngle = turnRight ? RailAngle.SEE : RailAngle.NEE;
			tempAngle = tempAngle.add(rotateAngle);
			const posOffset = new Vec3(turnArc, 0, 0).yRot(-oldTempAngle.angleRadians - rotateAngle.angleRadians / 2);
			tempPos = RailwayData.offsetBlockPos(oldTempPos, posOffset.x, posOffset.y, posOffset.z);

			if (reverse) {
				tempRailPath.unshift(new PathData(new Rail(tempPos, tempAngle.getOpposite(), oldTempPos, oldTempAngle, railType, TransportMode.AIRPLANE), 0, 0, tempPos, oldTempPos, stopIndex));
			} else {
				tempRailPath.push(new PathData(new Rail(oldTempPos, oldTempAngle, tempPos, tempAngle.getOpposite(), railType, TransportMode.AIRPLANE), 0, 0, oldTempPos, tempPos, stopIndex));
			}
		}

		return tempPos;
	}
}

class PathPart {

    public readonly direction: RailAngle | null;
    public readonly pos: BlockPos;
    public readonly otherOptions: Array<BlockPos>;

    public constructor(direction: RailAngle | null, pos: BlockPos, otherOptions: Array<BlockPos>) {
        this.direction = direction;
        this.pos = pos;
        this.otherOptions = otherOptions;
    }

    public isSame(newPos: BlockPos, newDirection: RailAngle) {
        return newPos.equals(this.pos) && newDirection == this.direction;
    }
}