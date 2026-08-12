import { IDispose } from "./IDispose";

export class DisposableSet<T extends IDispose> extends Set<T> {
    
    public override clear(): void {
        for (const v of this) {
            v.dispose();
        }
        super.clear();
    }

    public override delete(value: T): boolean {
        if (super.delete(value)) {
            value.dispose();
            return true;
        }
        return false;
    }

    private _() {}
}