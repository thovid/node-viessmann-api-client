"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const big_js_1 = require("big.js");
class NumberUtils {
    static isStepping(start, value, stepping) {
        const bigStart = start === undefined ? big_js_1.Big(0) : big_js_1.Big(start);
        const bigStepping = big_js_1.Big(stepping);
        const bigValue = big_js_1.Big(value);
        return NumberUtils.isWholeNumber(bigValue.minus(bigStart).div(bigStepping));
    }
    static isWholeNumber(value) {
        return value.eq(value.round(0));
    }
}
exports.NumberUtils = NumberUtils;
//# sourceMappingURL=number-utils.js.map