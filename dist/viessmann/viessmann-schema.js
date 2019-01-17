"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_optional_1 = require("typescript-optional");
const either_1 = require("../lib/either");
const logger_1 = require("../lib/logger");
const number_utils_1 = require("../lib/number-utils");
const siren_1 = require("../parser/siren");
class SimpleProperty {
    constructor(name, type, value) {
        this.name = name;
        this.type = type;
        this.value = value;
    }
}
exports.SimpleProperty = SimpleProperty;
class ComplexProperty {
    constructor(name, customType, value) {
        this.name = name;
        this.customType = customType;
        this.value = value;
        this.type = 'object';
    }
}
exports.ComplexProperty = ComplexProperty;
class FeatureAction extends siren_1.Action {
    constructor(action) {
        super(action);
    }
    validated(payload) {
        if (!this.isExecutable) {
            const msg = `FeatureAction[${this.name}]: not executable`;
            logger_1.log(msg, 'warn');
            return either_1.Either.left(msg);
        }
        if (payload === undefined) {
            const msg = `FeatureAction[${this.name}]: no payload`;
            logger_1.log(msg, 'warn');
            return either_1.Either.left(msg);
        }
        const validationErrors = [];
        this.fields.forEach(field => {
            this.validateField(field, payload).ifPresent(error => validationErrors.push(error));
        });
        if (validationErrors.length !== 0) {
            const msg = `FeatureAction[${this.name}]: validation failed: ${JSON.stringify(validationErrors)}`;
            logger_1.log(msg, 'warn');
            return either_1.Either.left(msg);
        }
        return either_1.Either.right(this);
    }
    validateField(field, payload) {
        logger_1.log(`FeatureAction[${this.name}]: validating field ${field.name}`, 'debug');
        const value = payload[field.name];
        if (value === undefined && field.required) {
            return typescript_optional_1.default.of(`Field[${field.name}]: required but not found`);
        }
        if (value === undefined) {
            return typescript_optional_1.default.empty();
        }
        if ((field.type === 'Schedule' ? 'object' : field.type) !== typeof value) {
            return typescript_optional_1.default.of(`Field[${field.name}]: required type ${field.type} but was ${typeof value}`);
        }
        if (field.type === 'number') {
            const val = value;
            if (field.min !== undefined && val < field.min) {
                return typescript_optional_1.default.of(`Field[${field.name}]: value ${value} must not be smaller than ${field.min}`);
            }
            if (field.max !== undefined && val > field.max) {
                return typescript_optional_1.default.of(`Field[${field.name}]: value ${value} must not be greater than ${field.min}`);
            }
            if (field.stepping !== undefined && !number_utils_1.NumberUtils.isStepping(field.min, val, field.stepping)) {
                return typescript_optional_1.default.of(`Field[${field.name}]: value ${value} must match the stepping ${field.stepping}`);
            }
        }
        if (field.type === 'string' && field.enum !== undefined && Array.isArray(field.enum)) {
            if (field.enum.indexOf(value) < 0) {
                return typescript_optional_1.default.of(`Field[${field.name}]: value ${value} must be one of ${JSON.stringify(field.enum)}`);
            }
        }
        if (field.type === 'Schedule') {
            const dayNames = Object.getOwnPropertyNames(value);
            for (const d of dayNames) {
                if (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(d) < 0) {
                    return typescript_optional_1.default.of(`Field[${field.name}]: value ${JSON.stringify(value)} `
                        + `is not a valid Schedule - unknown day ${d}`);
                }
                const day = value[d];
                if (!Array.isArray(day)) {
                    return typescript_optional_1.default.of(`Field[${field.name}]: value ${JSON.stringify(value)} `
                        + `is not a valid Schedule- day ${d} must be an array`);
                }
                if (!isNaN(Number(field.maxEntries)) && day.length > Number(field.maxEntries)) {
                    return typescript_optional_1.default.of(`Field[${field.name}]: value ${JSON.stringify(value)}`
                        + ` is not a valid Schedule- to many entries for day ${d}`);
                }
                for (const ds of day) {
                    const scheduleDay = asScheduleDay(ds);
                    if (!scheduleDay) {
                        return typescript_optional_1.default.of(`Field[${field.name}]: value ${JSON.stringify(value)}`
                            + ` is not a valid Schedule- day ${d} missing properties`);
                    }
                    if (!isValidTime(scheduleDay.start) || !isValidTime(scheduleDay.end)) {
                        return typescript_optional_1.default.of(`Field[${field.name}]: value ${JSON.stringify(value)}`
                            + ` is not a valid Schedule- day ${d} invalid start or end time`);
                    }
                    if (field.modes !== undefined && Array.isArray(field.modes) && field.modes.indexOf(scheduleDay.mode) < 0) {
                        return typescript_optional_1.default.of(`Field[${field.name}]: value ${JSON.stringify(value)}`
                            + ` is not a valid Schedule- mode ${scheduleDay.mode} not supported`);
                    }
                    if (scheduleDay.position < 0) {
                        return typescript_optional_1.default.of(`Field[${field.name}]: value ${JSON.stringify(value)}`
                            + ` is not a valid Schedule- position must be >= 0`);
                    }
                }
            }
        }
        return typescript_optional_1.default.empty();
    }
}
exports.FeatureAction = FeatureAction;
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
class SirenFeature {
    constructor(meta, entity) {
        this.meta = meta;
        const raw = entity.properties;
        let properties = [];
        if ('object' === typeof raw) {
            properties = Object
                .keys(raw)
                .map(key => constructProperty(key, raw[key]))
                .filter(p => p.isPresent)
                .map(p => p.get());
        }
        this.properties = properties;
        this.actions = entity.actions.map(a => new FeatureAction(a));
    }
    static of(entity) {
        const meta = getMetaInformation(entity);
        return meta.map(m => new SirenFeature(m, entity));
    }
    static createFeatures(entity, enabledOnly = true) {
        const result = new Map();
        selectLeafFeaturesOf(entity)
            .map(e => {
            const meta = getMetaInformation(e);
            return meta.map(m => new SirenFeature(m, e)).orElse(null);
        }).filter(f => {
            return (f !== null && (!enabledOnly || f.meta.isEnabled));
        })
            .forEach(f => result.set(f.meta.feature, f));
        return result;
    }
    getProperty(name) {
        const result = this.properties.find(p => name === p.name);
        if (result) {
            return either_1.Either.right(result);
        }
        return either_1.Either.left(`Property [${name}] does not exist in Feature[${this.meta.feature}]`);
    }
    getAction(name) {
        const result = this.actions.find(a => name === a.name);
        if (result) {
            return either_1.Either.right(result);
        }
        return either_1.Either.left(`Action [${name}] does not exist in Feature [${this.meta.feature}]`);
    }
}
exports.SirenFeature = SirenFeature;
function getMetaInformation(entity) {
    if (!isFeature(entity)) {
        return typescript_optional_1.default.empty();
    }
    const result = entity.entities
        .filter(e => e.rel.indexOf('http://schema.viessmann.com/link-relations#feature-meta-information') > -1)
        .map(e => e.properties)
        .filter(m => m.apiVersion !== undefined
        && m.isEnabled !== undefined
        && m.isReady !== undefined
        && m.gatewayId !== undefined
        && m.feature !== undefined
        && m.uri !== undefined
        && m.deviceId !== undefined)[0];
    return typescript_optional_1.default.ofNullable(result);
}
function selectLeafFeaturesOf(entity) {
    const grandChildren = entity.entities.map(e => selectLeafFeaturesOf(e));
    const leafs = flatten(grandChildren);
    if (isFeatureWithProperties(entity)) {
        leafs.push(entity);
    }
    return leafs;
}
function isFeature(entity) {
    return entity.hasClass('feature');
}
function isFeatureWithProperties(entity) {
    return isFeature(entity) && hasProperties(entity);
}
function hasProperties(entity) {
    if (entity.properties === undefined
        || 'object' !== typeof entity.properties
        || Object.keys(entity.properties).length === 0) {
        return false;
    }
    const propertyNames = Object.keys(entity.properties);
    if (propertyNames.indexOf('components') > -1) {
        return false;
    }
    return true;
}
const simpleTypes = ['string', 'number', 'boolean', 'array'];
function constructProperty(name, raw) {
    if (raw === undefined || raw === null || 'object' !== typeof raw) {
        return typescript_optional_1.default.empty();
    }
    const type = raw.type;
    const value = raw.value;
    if (type === undefined || value === undefined) {
        return typescript_optional_1.default.empty();
    }
    if (simpleTypes.indexOf(type) > -1) {
        return typescript_optional_1.default.of(new SimpleProperty(name, type, value));
    }
    return typescript_optional_1.default.of(new ComplexProperty(name, type, value));
}
function flatten(arr, result = []) {
    for (let i = 0, length = arr.length; i < length; i++) {
        const value = arr[i];
        if (value !== undefined) {
            if (Array.isArray(value)) {
                flatten(value, result);
            }
            else {
                result.push(value);
            }
        }
    }
    return result;
}
//# sourceMappingURL=viessmann-schema.js.map