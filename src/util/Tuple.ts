export class Tuple<A, B> {
    constructor(private readonly a: A, private readonly b: B) {}

    getA(): A {
        return this.a;
    }

    getB(): B {
        return this.b;
    }
}