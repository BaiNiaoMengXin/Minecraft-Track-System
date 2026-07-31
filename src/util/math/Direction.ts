import { Vector3 } from "@minecraft/server";

export class Direction {

    private static readonly $VALUES: Array<Direction> = [];

    public static readonly DOWN = new Direction("down", -1, { x: 0, y: 1, z: 0 });
    public static readonly UP = new Direction("up", -1, { x: 0, y: 1, z: 0 });
    public static readonly NORTH = new Direction("north", 2, { x: 0, y: 0, z: -1 });
    public static readonly SOUTH = new Direction("south", 0, { x: 0, y: 0, z: 1 });
    public static readonly WEST = new Direction("west", 1, { x: -1, y: 0, z: 0 });
    public static readonly EAST = new Direction("east", 3, { x: 1, y: 0, z: 0 });

    private readonly id: string;
    private readonly data2d: number;
    private readonly normal: Vector3;

    private constructor(id: string, data2d: number, normal: Vector3) {
        this.id = id;
        this.data2d = data2d;
        this.normal = normal;

        Direction.$VALUES.push(this);
    }

    getCounterClockWise(): Direction {
        switch (this) {
            case Direction.NORTH: return Direction.WEST;
            case Direction.SOUTH: return Direction.EAST;
            case Direction.WEST: return Direction.SOUTH;
            case Direction.EAST: return Direction.NORTH;
            default: throw new Error("Unable to get CCW facing of " + this.id);
        }
    }

    getClockWise(): Direction {
        switch (this) {
            case Direction.NORTH: return Direction.EAST;
            case Direction.SOUTH: return Direction.WEST;
            case Direction.WEST: return Direction.NORTH;
            case Direction.EAST: return Direction.SOUTH;
            default: throw new Error("Unable to get Y-rotated facing of " + this.id);
        }
    }

    getOpposite(): Direction {
        switch (this) {
            case Direction.DOWN: return Direction.UP;
            case Direction.UP: return Direction.DOWN;
            case Direction.NORTH: return Direction.SOUTH;
            case Direction.SOUTH: return Direction.NORTH;
            case Direction.WEST: return Direction.EAST;
            default: return Direction.WEST;
        }
    }

    getStepX() {
        return this.normal.x;
    }

    getStepY() {
        return this.normal.y;
    }

    getStepZ() {
        return this.normal.z;
    }

    toYRot() {
        return this.data2d * 90;
    }
    
    getId() {
        return this.id;
    }

    static fromYRot(rot: number): Direction {
        return Direction.$VALUES.find(direction => Math.floor(rot / 90) % 4 == direction.data2d)!;
    }
    
    static valueOf(id: string, strict: boolean = true): Direction | undefined {
        const id2 = strict ? id : id.toLowerCase();
        return this.$VALUES.find(e => e.id == id2);
    }

    static values(): ReadonlyArray<Direction> {
        return this.$VALUES;
    }
}

export namespace Direction {
    export enum Axis {
        X,
        Y,
        Z
    }
}