
class Value {

    private value: unknown;

    public asLong(): bigint {
        return BigInt(this.value as any);
    }

    public asInt(): number {
        return ~~MessagePackHelper.toNumber(this.value);
    }

    public asDouble(): number {
        return MessagePackHelper.toNumber(this.value);
    }

    public asString(): string {
        return MessagePackHelper.valToString(this.value);
    }

    /**
     * If you want to use this function, the key type of your map must be string, 
     * and the values must be stored using the "MessagePackHelper.convertStringMap" function.
     */
    public asMapValue(): Map<string, unknown> {
        const resultMap = new Map<string, unknown>();
        const oldMap = this.value as Record<string, unknown>;
        for (const key in oldMap) {
            resultMap.set(key, oldMap[key]);
        }
        return resultMap;
    }

    public asRecordValue(): Record<string, unknown> {
        return this.value as Record<string, unknown>;
    }

    public asArrayValue(): Array<unknown> {
        return this.value as Array<unknown>;
    }

    public __$$__setValue(value: unknown): this {
        this.value = value;
        return this;
    }
}


export class MessagePackHelper<U extends Record<string, unknown>> {

    private readonly map: U;
    private readonly valueHepler: Value;

    public constructor(map: U) {
        this.map = map;
        this.valueHepler = new Value()
    }

    public getBoolean(key: keyof U, defaultValue: boolean = false): boolean {
        return this.getOrDefault<boolean>(key, defaultValue, value => {
            if (typeof value === "boolean") {
                return value;
            } else {
                throw new RangeError(`Cannot convert ${typeof value} to boolean`);
            }
        });
    }

    public getInt(key: keyof U, defaultValue: number = 0): number {
        return this.getOrDefault<number>(key, defaultValue, value => ~~MessagePackHelper.toNumber(value));
    }

    public getLong(key: keyof U, defaultValue: bigint = 0n): bigint {
        return this.getOrDefault<bigint>(key, defaultValue, value => BigInt(value as any));
    }

    public getDouble(key: keyof U, defaultValue: number = 0): number {
        return this.getOrDefault<number>(key, defaultValue, value => MessagePackHelper.toNumber(value));
    }

    public getString(key: keyof U, defaultValue: string = ""): string {
        return this.getOrDefault<string>(key, defaultValue, value => MessagePackHelper.valToString(value));
    }

    public iterateArrayValue(key: keyof U, consumer: (value: Value, index: number) => void): void {
        if (key in (this.map as object) && Array.isArray(this.map[key])) {
            (this.map[key] as Array<unknown>).forEach((value, index) => consumer(this.valueHepler.__$$__setValue(value), index));
        }
    }

    /**
     * If you want to use this function, the key type of your map must be string, 
     * and the values must be stored using the "MessagePackHelper.convertStringMap" function.
     */
    public iterateMapValue(key: keyof U, consumer: (key: string, value: Value) => void): void {
        if (key in (this.map as object)) {
            const obj = this.map[key];
            if (!Array.isArray(obj) && typeof obj == "object") {
                for (const keyMap in obj) {
                    consumer(keyMap, this.valueHepler.__$$__setValue(obj[keyMap]));
                }
            }
        }
    }

    public static convertStringMap<T>(map: Map<string, T>): Record<string, T> {
        const obj: Record<string, T> = {};
        for (const [key, value] of map) {
            obj[key] = value;
        }
        return obj;
    }

    public static toNumber(value: any): number {
        const type = typeof value
        if (type === "number") {
            return value
        } else if (type === "bigint") {
            return Number(value)
        } else {
            throw new RangeError(`Cannot convert ${type} to number`)
        }
    }

    public static valToString(value: any): string {
        if (typeof value === "string") {
            return value;
        } else {
            throw new RangeError(`Cannot convert ${typeof value} to string`);
        }
    }

    private getOrDefault<T>(key: keyof U, defaultValue: T, getData: (value: unknown) => T): T {
        return (key in (this.map as object)) ? getData(this.map[key]) : defaultValue;
    }
}
