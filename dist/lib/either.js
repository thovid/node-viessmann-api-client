"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_optional_1 = require("typescript-optional");
var EitherType;
(function (EitherType) {
    EitherType[EitherType["Left"] = 0] = "Left";
    EitherType[EitherType["Right"] = 1] = "Right";
})(EitherType = exports.EitherType || (exports.EitherType = {}));
function exists(t) {
    return t !== null && t !== undefined;
}
function either(l, r) {
    if (exists(l) && exists(r)) {
        throw new TypeError('Cannot construct an Either with both a left and a right');
    }
    if (!exists(l) && !exists(r)) {
        throw new TypeError('Cannot construct an Either with neither a left nor a right');
    }
    if (exists(l) && !exists(r)) {
        return Either.left(l);
    }
    if (!exists(l) && exists(r)) {
        return Either.right(r);
    }
}
exports.either = either;
function leftUnitTransformer() {
    return {
        left: (x) => {
            return Either.left(x);
        },
    };
}
exports.leftUnitTransformer = leftUnitTransformer;
function leftPromiseTransformer() {
    return {
        left: (x) => {
            return Promise.resolve(Either.left(x));
        },
    };
}
exports.leftPromiseTransformer = leftPromiseTransformer;
/**
 * @name Either
 * @class Either has exactly two sub types, Left (L) and Right (R). If an
 *     Either<L, R> object contains an instance of L, then the Either is a
 *     Left. Otherwise it contains an instance of R and is a Right. By
 *     convention, the Left constructor is used to hold an error value and
 *     the Right constructor is used to hold a correct value.
 */
class Either {
    constructor(type, l, r) {
        this.type = type;
        this.l = l;
        this.r = r;
        this.of = this.unit;
    }
    static left(l) {
        return new Either(EitherType.Left, l);
    }
    static right(r) {
        return new Either(EitherType.Right, null, r);
    }
    isLeft() {
        return this.caseOf({ left: () => true, right: () => false });
    }
    isRight() {
        return !this.isLeft();
    }
    unit(t) {
        return Either.right(t);
    }
    flatMap(f, transf) {
        if (transf === undefined) {
            const g = f;
            return this.flatMap(g, leftUnitTransformer());
        }
        if (this.type === EitherType.Right) {
            return f(this.r);
        }
        else {
            return transf.left(this.l);
        }
    }
    map(f) {
        return this.flatMap(v => this.unit(f(v)));
    }
    caseOf(pattern) {
        return this.type === EitherType.Right ?
            pattern.right(this.r) :
            pattern.left(this.l);
    }
    toRight() {
        if (this.isRight()) {
            return typescript_optional_1.default.ofNullable(this.r);
        }
        return typescript_optional_1.default.empty();
    }
    toLeft() {
        if (this.isLeft()) {
            return typescript_optional_1.default.ofNullable(this.l);
        }
        return typescript_optional_1.default.empty();
    }
}
exports.Either = Either;
//# sourceMappingURL=either.js.map