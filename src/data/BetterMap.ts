import { Entity } from "@minecraft/server";
import { JavaObject } from "jLib/Object";

export class BetterMap<K extends JavaObject | Entity, U> extends Map<K, U> {

    private callEquals(key: K, key2: K): boolean {
        if (key instanceof Entity) {
            return key.id == ((key2 as any) as Entity).id;
        } else {
            return key.equals(key2 as any);
        }
    }

    public override delete(key: K): boolean {
        if (super.has(key)) {
            return super.delete(key);
        }
        for (const [key2, value] of this) {
            if (this.callEquals(key2, key)) {
                return super.delete(key2);
            }
        }
        return false;
    }

    public override get(key: K): U | undefined {
        if (super.has(key)) {
            return super.get(key);
        }
        for (const [key2, value] of this) {
            if (this.callEquals(key2, key)) {
                return value;
            }
        }
        return undefined;
    }

    public override has(key: K): boolean {
        if (super.has(key)) {
            return true;
        }
        for (const [key2, value] of this) {
            if (this.callEquals(key2, key)) {
                return true;
            }
        }
        return false;
    }

    public override set(key: K, value: U): this {
        if (super.has(key)) {
            return super.set(key, value);
        }
        for (const [key2, value2] of this) {
            if (this.callEquals(key2, key)) {
                return super.set(key2, value);
            }
        }
        return super.set(key, value);
    }

    public isEmpty(): boolean {
        return this.size === 0
    }
}