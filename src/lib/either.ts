import Optional from 'typescript-optional';

export enum EitherType {Left, Right}

export interface EitherPatterns<L, R, T> {
    left: (l: L) => T;
    right: (r: R) => T;
}

function exists<T>(t: T): boolean {
    return t !== null && t !== undefined;
}

export function either<L, R>(l?: L, r?: R): Either<L, R> {
    if (exists(l) && exists(r)) {
        throw new TypeError('Cannot construct an Either with both a left and a right');
    }
    if (!exists(l) && !exists(r)) {
        throw new TypeError('Cannot construct an Either with neither a left nor a right');
    }
    if (exists(l) && !exists(r)) {
        return Either.left<L, R>(l);
    }
    if (!exists(l) && exists(r)) {
        return Either.right<L, R>(r);
    }
}

export interface LeftTransformer<L, N> {
    left(x: L): N;
}

export function leftUnitTransformer<L, T>(): LeftTransformer<L, Either<L, T>> {
    return {
        left: (x: L) => {
            return Either.left<L, T>(x);
        },
    };
}

export function leftPromiseTransformer<L, T>(): LeftTransformer<L, Promise<Either<L, T>>> {
    return {
        left: (x: L) => {
            return Promise.resolve(Either.left<L, T>(x));
        },
    };
}

/**
 * @name Either
 * @class Either has exactly two sub types, Left (L) and Right (R). If an
 *     Either<L, R> object contains an instance of L, then the Either is a
 *     Left. Otherwise it contains an instance of R and is a Right. By
 *     convention, the Left constructor is used to hold an error value and
 *     the Right constructor is used to hold a correct value.
 */
export class Either<L, R> {

    constructor(private type: EitherType,
        private l?: L,
        private r?: R) {}

    public static left<L, R>(l: L): Either<L, R> {
        return new Either<L, R>(EitherType.Left, l);
    }

    public static right<L, R>(r: R): Either<L, R> {
        return new Either<L, R>(EitherType.Right, null, r);
    }

    public isLeft(): boolean {
        return this.caseOf({left: () => true, right: () => false});
    }

    public isRight(): boolean {
        return !this.isLeft();
    }

    public unit<T>(t: T): Either<L, T> {
        return Either.right<L, T>(t);
    }

    public flatMap<T>(f: (r: R) => Either<L, T>): Either<L, T>;
    public flatMap<N>(f: (r: R) => N, transf: LeftTransformer<L, N>): N;
    public flatMap<T>(f: ((r: R) => T) | ((r: R) => Either<L, T>), transf?: LeftTransformer<L, T>): T | Either<L, T> {
        if (transf === undefined) {
            const g = f as (r: R) => Either<L, T>;
            return this.flatMap(g, leftUnitTransformer());
        }

        if (this.type === EitherType.Right) {
            return f(this.r);
        } else {
            return transf.left(this.l);
        }
    }

    public of = this.unit;

    public map<T>(f: (r: R) => T): Either<L, T> {
        return this.flatMap(v => this.unit<T>(f(v)));
    }

    public caseOf<T>(pattern: EitherPatterns<L, R, T>): T {
        return this.type === EitherType.Right ?
            pattern.right(this.r) :
            pattern.left(this.l);
    }

    public toRight(): Optional<R> {
        if (this.isRight()) {
            return Optional.ofNullable(this.r);
        }
        return Optional.empty();
    }

    public toLeft(): Optional<L> {
        if (this.isLeft()) {
            return Optional.ofNullable(this.l);
        }
        return Optional.empty();
    }
}
