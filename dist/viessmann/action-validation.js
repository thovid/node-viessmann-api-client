"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const either_1 = require("../lib/either");
const logger_1 = require("../lib/logger");
const number_utils_1 = require("../lib/number-utils");
function validateField(field, payload) {
    logger_1.log(`FeatureAction[${this.name}]: validating field ${field.name}`, 'debug');
    const value = payload[field.name];
    return validateRequired(field, value)
        .flatMap(ok => validateType(field, value))
        .flatMap(ok => validateIfNumber(field, value))
        .flatMap(ok => validateIfString(field, value))
        .flatMap(ok => validateIfSchedule(field, value))
        .toLeft();
}
exports.validateField = validateField;
function validateRequired(field, value) {
    if (value === undefined && field.required) {
        return either_1.Either.left(`Field[${field.name}]: required but not found`);
    }
    return either_1.Either.right(null);
}
function validateType(field, value) {
    if (value !== undefined && (field.type === 'Schedule' ? 'object' : field.type) !== typeof value) {
        return either_1.Either.left(`Field[${field.name}]: required type ${field.type} but was ${typeof value}`);
    }
    return either_1.Either.right(null);
}
function validateIfNumber(field, value) {
    if (value !== undefined && field.type === 'number') {
        const val = value;
        if (field.min !== undefined && val < field.min) {
            return either_1.Either.left(`Field[${field.name}]: value ${value} must not be smaller than ${field.min}`);
        }
        if (field.max !== undefined && val > field.max) {
            return either_1.Either.left(`Field[${field.name}]: value ${value} must not be greater than ${field.min}`);
        }
        if (field.stepping !== undefined && !number_utils_1.NumberUtils.isStepping(field.min, val, field.stepping)) {
            return either_1.Either.left(`Field[${field.name}]: value ${value} must match the stepping ${field.stepping}`);
        }
    }
    return either_1.Either.right(null);
}
function validateIfString(field, value) {
    if (value !== undefined && field.type === 'string' && field.enum !== undefined && Array.isArray(field.enum)) {
        if (field.enum.indexOf(value) < 0) {
            return either_1.Either.left(`Field[${field.name}]: value ${value} must be one of ${JSON.stringify(field.enum)}`);
        }
    }
    return either_1.Either.right(null);
}
function validateIfSchedule(field, value) {
    if (value !== undefined && field.type === 'Schedule') {
        const dayNames = Object.getOwnPropertyNames(value);
        for (const d of dayNames) {
            if (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(d) < 0) {
                return either_1.Either.left(`Field[${field.name}]: value ${JSON.stringify(value)} `
                    + `is not a valid Schedule - unknown day ${d}`);
            }
            const day = value[d];
            if (!Array.isArray(day)) {
                return either_1.Either.left(`Field[${field.name}]: value ${JSON.stringify(value)} `
                    + `is not a valid Schedule- day ${d} must be an array`);
            }
            if (!isNaN(Number(field.maxEntries)) && day.length > Number(field.maxEntries)) {
                return either_1.Either.left(`Field[${field.name}]: value ${JSON.stringify(value)}`
                    + ` is not a valid Schedule- to many entries for day ${d}`);
            }
            for (const ds of day) {
                const scheduleDay = asScheduleDay(ds);
                if (!scheduleDay) {
                    return either_1.Either.left(`Field[${field.name}]: value ${JSON.stringify(value)}`
                        + ` is not a valid Schedule- day ${d} missing properties`);
                }
                if (!isValidTime(scheduleDay.start) || !isValidTime(scheduleDay.end)) {
                    return either_1.Either.left(`Field[${field.name}]: value ${JSON.stringify(value)}`
                        + ` is not a valid Schedule- day ${d} invalid start or end time`);
                }
                if (field.modes !== undefined && Array.isArray(field.modes) && field.modes.indexOf(scheduleDay.mode) < 0) {
                    return either_1.Either.left(`Field[${field.name}]: value ${JSON.stringify(value)}`
                        + ` is not a valid Schedule- mode ${scheduleDay.mode} not supported`);
                }
                if (scheduleDay.position < 0) {
                    return either_1.Either.left(`Field[${field.name}]: value ${JSON.stringify(value)}`
                        + ` is not a valid Schedule- position must be >= 0`);
                }
            }
        }
    }
    return either_1.Either.right(null);
}
function asScheduleDay(obj) {
    if (isScheduleDay(obj))
        return obj;
    return undefined;
}
function isScheduleDay(obj) {
    const sd = obj;
    return sd.start !== undefined && sd.end !== undefined && sd.mode !== undefined && sd.position !== undefined;
}
function isValidTime(time) {
    const parsedTime = time.split(':');
    if (parsedTime.length !== 2)
        return false;
    const hh = parseInt(parsedTime[0], 10);
    const mm = parseInt(parsedTime[1], 10);
    if (isNaN(hh) || 0 > hh || hh > 23)
        return false;
    if (isNaN(mm) || 0 > mm || mm > 59)
        return false;
    return true;
}
//# sourceMappingURL=action-validation.js.map