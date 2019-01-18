import {Big} from 'big.js';

export class NumberUtils {

    public static isStepping(start: number | undefined, value: number, stepping: number): boolean {
        const bigStart = start === undefined ? Big(0) : Big(start);
        const bigStepping = Big(stepping);
        const bigValue = Big(value);
        return NumberUtils.isWholeNumber(bigValue.minus(bigStart).div(bigStepping));
    }

    public static isWholeNumber(value: Big): boolean {
        return value.eq(value.round(0));
    }
}
