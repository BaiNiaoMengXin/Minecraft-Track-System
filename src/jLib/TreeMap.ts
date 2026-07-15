import { Comparable } from './Comparable'

export class TreeMap<K, V> extends Map<K, V> {

    private compareFn: (a: K, b: K) => number
    private sortedKeys: K[] = []
    private specifiedCompareFn = false

    private static readonly comparators = {
        number: (a: number, b: number) => a - b,
        bigint: (a: bigint, b: bigint) => Number(a - b),
        string: (a: string, b: string) => a.localeCompare(b),
        date: (a: Date, b: Date) => a.getTime() - b.getTime(),
    }

    private static isIterable(value: unknown): value is Iterable<readonly [unknown, unknown]> {
        return value != null && (value as any)[Symbol.iterator] != null
    }

    private static isComparable(value: unknown): value is Comparable<unknown> {
        return typeof (value as Record<string, unknown>).compare === 'function'
    }

    private static decideCompareFn(value: unknown): (a: any, b: any) => number {
        if (typeof value === 'number') return TreeMap.comparators.number
        if (typeof value === 'string') return TreeMap.comparators.string
        if (typeof value === 'bigint') return TreeMap.comparators.bigint
        if (value instanceof Date) return TreeMap.comparators.date
        if (TreeMap.isComparable(value)) {
            return (a: Comparable<unknown>, b: Comparable<unknown>) => a.compareTo(b)
        }
        throw new Error(
            'Cannot sort keys in this map. You have to specify compareFn if the type of key in this map is not number, string, or Date.'
        )
    }

    get comparator(): (a: K, b: K) => number {
        return this.compareFn
    }

    constructor(compareFn?: (a: K, b: K) => number)
    constructor(iterable?: readonly (readonly [K, V])[] | Map<K, V> | null, compareFn?: (a: K, b: K) => number)
    constructor(
        iterableOrCompareFn?: readonly (readonly [K, V])[] | Map<K, V> | ((a: K, b: K) => number) | null,
        compareFn?: (a: K, b: K) => number
    ) {
        super()
        this.sortedKeys = []

        if (typeof iterableOrCompareFn === 'function') {
            this.compareFn = iterableOrCompareFn
            this.specifiedCompareFn = true
            return
        }

        this.compareFn = compareFn ?? (() => 0)
        this.specifiedCompareFn = compareFn != null

        if (TreeMap.isIterable(iterableOrCompareFn)) {
            for (const [k, v] of iterableOrCompareFn) {
                this.set(k, v)
            }
        }
    }

    static fromMap<K, V>(map: Map<K, V>, compareFn?: (a: K, b: K) => number): TreeMap<K, V> {
        const treeMap = new TreeMap<K, V>(compareFn)
        treeMap.setAll(map)
        return treeMap
    }

    duplicate(): TreeMap<K, V> {
        return TreeMap.fromMap(this, this.compareFn)
    }

    toMap(): Map<K, V> {
        const normalMap = new Map<K, V>()
        const entries = Array.from(super.entries()).sort((a, b) => this.compareFn(a[0], b[0]))
        for (const [k, v] of entries) {
            normalMap.set(k, v)
        }
        return normalMap
    }

    reverseKeys(): IterableIterator<K> {
        return [...this.sortedKeys].reverse().values()
    }

    get(key: K): V | undefined {
        const resultKey = this.sortedKeys.find(k => this.compareFn(k, key) === 0)
        return resultKey != null ? super.get(resultKey) : undefined
    }

    set(key: K, value: V): this {
        if (this.sortedKeys.length === 0 && !this.specifiedCompareFn) {
            this.compareFn = TreeMap.decideCompareFn(key)
            this.specifiedCompareFn = true
        }

        const actualKey = this.sortedKeys.find(k => this.compareFn(k, key) === 0)
        if (actualKey == null) {
            this.sortedKeys.push(key)
            super.set(key, value)
        } else {
            super.set(actualKey, value)
        }

        this.sortedKeys.sort(this.compareFn)
        return this
    }

    setAll(map: Map<K, V>): this {
        for (const [k, v] of map) {
            this.set(k, v)
        }
        return this
    }

    delete(key: K): boolean {
        if (!super.delete(key)) return false
        this.sortedKeys = this.sortedKeys.filter(k => this.compareFn(k, key) !== 0)
        return true
    }

    clear(): void {
        super.clear()
        this.sortedKeys = []
    }

    keys(): IterableIterator<K> {
        return this.sortedKeys.values()
    }

    values(): IterableIterator<V> {
        return this.sortedKeys.map(k => super.get(k)!).values()
    }

    entries(): IterableIterator<[K, V]> {
        return this.toMap().entries()
    }

    firstKey(): K | undefined {
        return this.sortedKeys[0]
    }

    firstEntry(): [K, V] | undefined {
        const key = this.firstKey()
        if (key == null) return undefined
        const value = this.get(key)
        return value === undefined ? undefined : [key, value]
    }

    lastKey(): K | undefined {
        return this.sortedKeys[this.sortedKeys.length - 1]
    }

    lastEntry(): [K, V] | undefined {
        const key = this.lastKey()
        if (key == null) return undefined
        const value = this.get(key)
        return value === undefined ? undefined : [key, value]
    }

    shiftEntry(): [K, V] | undefined {
        const entry = this.firstEntry()
        if (entry == null) return undefined
        this.delete(entry[0])
        return entry
    }

    popEntry(): [K, V] | undefined {
        const entry = this.lastEntry()
        if (entry == null) return undefined
        this.delete(entry[0])
        return entry
    }

    floorKey(key: K): K | undefined {
        const filtered = this.sortedKeys.filter(k => this.compareFn(k, key) <= 0)
        return filtered[filtered.length - 1]
    }

    floorEntry(key: K): [K, V] | undefined {
        const k = this.floorKey(key)
        if (k == null) return undefined
        const v = this.get(k)
        return v === undefined ? undefined : [k, v]
    }

    ceilingKey(key: K): K | undefined {
        const filtered = this.sortedKeys.filter(k => this.compareFn(k, key) >= 0)
        return filtered[0]
    }

    ceilingEntry(key: K): [K, V] | undefined {
        const k = this.ceilingKey(key)
        if (k == null) return undefined
        const v = this.get(k)
        return v === undefined ? undefined : [k, v]
    }

    lowerKey(key: K): K | undefined {
        const filtered = this.sortedKeys.filter(k => this.compareFn(k, key) < 0)
        return filtered[filtered.length - 1]
    }

    lowerEntry(key: K): [K, V] | undefined {
        const k = this.lowerKey(key)
        if (k == null) return undefined
        const v = this.get(k)
        return v === undefined ? undefined : [k, v]
    }

    higherKey(key: K): K | undefined {
        const filtered = this.sortedKeys.filter(k => this.compareFn(k, key) > 0)
        return filtered[0]
    }

    higherEntry(key: K): [K, V] | undefined {
        const k = this.higherKey(key)
        if (k == null) return undefined
        const v = this.get(k)
        return v === undefined ? undefined : [k, v]
    }

    splitLower(key: K, include = true): TreeMap<K, V> {
        const entries = Array.from(this.entries()).filter(([k]) => {
            const cmp = this.compareFn(k, key)
            return include ? cmp <= 0 : cmp < 0
        })
        return new TreeMap(entries, this.compareFn)
    }

    splitHigher(key: K, include = true): TreeMap<K, V> {
        const entries = Array.from(this.entries()).filter(([k]) => {
            const cmp = this.compareFn(k, key)
            return include ? cmp >= 0 : cmp > 0
        })
        return new TreeMap(entries, this.compareFn)
    }

    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: unknown): void {
        for (const [k, v] of Array.from(this.entries())) {
            callbackfn.call(thisArg, v, k, this)
        }
    }
}
