import Optional from 'typescript-optional';
export declare enum EitherType {
    Left = 0,
    Right = 1
}
export interface EitherPatterns<L, R, T> {
    left: (l: L) => T;
    right: (r: R) => T;
}
export declare function either<L, R>(l?: L, r?: R): Either<L, R>;
export interface LeftTransformer<L, N> {
    left(x: L): N;
}
export declare function leftUnitTransformer<L, T>(): LeftTransformer<L, Either<L, T>>;
export declare function leftPromiseTransformer<L, T>(): LeftTransformer<L, Promise<Either<L, T>>>;
/**
 * @name Either
 * @class Either has exactly two sub types, Left (L) and Right (R). If an
 *     Either<L, R> object contains an instance of L, then the Either is a
 *     Left. Otherwise it contains an instance of R and is a Right. By
 *     convention, the Left constructor is used to hold an error value and
 *     the Right constructor is used to hold a correct value.
 */
export declare class Either<L, R> {
    private type;
    private l?;
    private r?;
    constructor(type: EitherType, l?: L, r?: R);
    static left<L, R>(l: L): Either<L, R>;
    static right<L, R>(r: R): Either<L, R>;
    isLeft(): boolean;
    isRight(): boolean;
    unit<T>(t: T): Either<L, T>;
    flatMap<T>(f: (r: R) => Either<L, T>): Either<L, T>;
    flatMap<N>(f: (r: R) => N, transf: LeftTransformer<L, N>): N;
    of: <T>(t: T) => Either<L, T>;
    map<T>(f: (r: R) => T): Either<L, T>;
    caseOf<T>(pattern: EitherPatterns<L, R, T>): T;
    toRight(): Optional<R>;
    toLeft(): Optional<L>;
}
