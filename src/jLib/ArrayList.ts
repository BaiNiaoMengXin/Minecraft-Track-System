import { Comparable } from "./Comparable";
import { JavaObject } from "./Object";

/**
 * Please do net use ArrayList for serialization/deserialization operations(e.g., directly including it in an object and processing with JSON.stringify/JSON.parse), 
 * otherwise it will degrade to a plain Array, 
 * even if it appears to be of type ArrayList, 
 * 
 * If you have such requirements, please use its "toArray" function and its "from" function.
 */
export class ArrayList<T/* extends Comparable<T> | JavaObject*/> extends Array<T> {

    static get [Symbol.species]() {
        return Array;
    }

    public toArray(): Array<T> {
        return this;
    }

    public static override from<T>(iterable: ArrayLike<T> | Iterable<T>): ArrayList<T>;
    public static override from<T, U>(arrayLike: ArrayLike<T>, mapfn: (v: T, k: number) => U): ArrayList<U>;

    public static override from<T, U>(arg1: ArrayLike<T> | Iterable<T>, mapfn?: (v: T, k: number) => U): ArrayList<T> | ArrayList<U> {
        if (mapfn != undefined) {
            return new ArrayList(...Array.from(arg1, mapfn));
        }
        return new ArrayList(...Array.from(arg1));
    }

    private callEquals(a: T, b: T) {
        return (a as JavaObject).equals ?
            (a as JavaObject).equals(b as JavaObject) :
            a === b;
    }

    override indexOf(searchElement: T, fromIndex?: number): number {
        return super.findIndex((item, index) => {
            return index >= (fromIndex ?? 0) && this.callEquals(item, searchElement);
        });
    }

    override lastIndexOf(searchElement: T, fromIndex?: number): number {
        return super.findLastIndex((item, index) => {
            return index >= (fromIndex ?? 0) && this.callEquals(item, searchElement);
        });
    }  
    
    override includes(searchElement: T, fromIndex?: number): boolean {
        for (let i = fromIndex ?? 0; i < this.length; i++) {
            const item = this[i];
            if (this.callEquals(item, searchElement)) {
                return true;
            }
        }
        return false;
    }
    
    public remove(index: number): T;

    public remove(value: T): boolean;

    public remove(arg1: number | T): T | boolean {
        if (typeof arg1 === "number") {
            if (arg1 < 0 || arg1 > this.length - 1) {
                throw new RangeError()
            }
            const result = this[arg1];
            this.splice(arg1, 1);
            return result;
        } else {
            const index = this.indexOf(arg1);
            if (index != -1) {
                this.splice(index, 1);
                return true;
            }
            return false;
        }
    }

    public override sort(this: T extends Comparable<T> ? this : never): this {
        return ArrayList.from(super.sort((a, b) => (a as Comparable<T>).compareTo(b))) as this;
    }

    public isEmpty(): boolean {
        return this.length == 0;
    }

    public removeIf(predicate: (item: T) => boolean): this {
        for (let i = this.length - 1; i >= 0; i--) {
            if (predicate(this[i])) {
                this.splice(i, 1);
            }
        }
        return this;
    }

    public clear(): void {
        this.length = 0;
    }

    public pushAll(other: Array<T>): this;
    public pushAll(other: Iterable<T>): this;

    public pushAll(other: Array<T> | Iterable<T>): this {
        if (Array.isArray(other)) {
            const chunkSize = 5000;
            
            for (let i = 0; i < other.length; i += chunkSize) {
                const chunk = other.slice(i, i + chunkSize);
                this.push(...chunk);
            }
        } else {
            for (const a of other) {
                this.push(a)
            }
        }
        return this
    }
}
