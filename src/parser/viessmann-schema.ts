import Optional from 'typescript-optional';
import {Either} from '../lib/either';
import {NumberUtils} from '../lib/number-utils';
import {log} from '../logger';
import {Action, Entity, Field} from './siren';

export interface MetaInformation {
    apiVersion: number;
    isEnabled: boolean;
    isReady: boolean;
    gatewayId: string;
    feature: string;
    uri: string;
    deviceId: string;
}

export interface Property {
    name: string;
    type: string;
    value: any;
}

export class SimpleProperty implements Property {
    constructor(public readonly name: string, public readonly type: string, public readonly value: any) {}
}

export class ComplexProperty implements Property {
    public readonly type: string;
    constructor(public readonly name: string, public readonly customType: string, public readonly value: object) {
        this.type = 'object';
    }
}

export class FeatureAction extends Action {

    constructor(action: Action) {
        super(action);
    }

    public validated(payload?: any): Either<string, FeatureAction> {
        if (!this.isExecutable) {
            const msg = `FeatureAction[${this.name}]: not executable`;
            log(msg, 'warn');
            return Either.left(msg);
        }

        if (payload === undefined) {
            const msg = `FeatureAction[${this.name}]: no payload`;
            log(msg, 'warn');
            return Either.left(msg);
        }

        const validationErrors: string[] = [];
        this.fields.forEach(field => {
            this.validateField(field, payload).ifPresent(error => validationErrors.push(error));
        });
        if (validationErrors.length !== 0) {
            const msg = `FeatureAction[${this.name}]: validation failed: ${JSON.stringify(validationErrors)}`;
            log(msg, 'warn');
            return Either.left(msg);
        }
        return Either.right(this);
    }

    private validateField(field: Field, payload?: any): Optional<string> {
        log(`FeatureAction[${this.name}]: validating field ${field.name}`, 'debug');
        const value = payload[field.name];
        if (value === undefined && field.required) {
            return Optional.of(`Field[${field.name}]: required but not found`);
        }

        if (value === undefined) {
            return Optional.empty();
        }

        if ((field.type === 'Schedule' ? 'object' : field.type) !== typeof value) {
            return Optional.of(`Field[${field.name}]: required type ${field.type} but was ${typeof value}`);
        }

        if (field.type === 'number') {
            const val = value as number;
            if (field.min !== undefined && val < field.min) {
                return Optional.of(`Field[${field.name}]: value ${value} must not be smaller than ${field.min}`);
            }
            if (field.max !== undefined && val > field.max) {
                return Optional.of(`Field[${field.name}]: value ${value} must not be greater than ${field.min}`);
            }
            if (field.stepping !== undefined && !NumberUtils.isStepping(field.min, val, field.stepping)) {
                return Optional.of(`Field[${field.name}]: value ${value} must match the stepping ${field.stepping}`);
            }
        }

        if (field.type === 'string' && field.enum !== undefined && Array.isArray(field.enum)) {
            if (field.enum.indexOf(value) < 0) {
                return Optional.of(`Field[${field.name}]: value ${value} must be one of ${JSON.stringify(field.enum)}`);
            }
        }

        if (field.type === 'Schedule') {
            const dayNames = Object.getOwnPropertyNames(value);
            for (const d of dayNames) {
                if (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(d) < 0) {
                    return Optional.of(`Field[${field.name}]: value ${JSON.stringify(value)} `
                        + `is not a valid Schedule - unknown day ${d}`);
                }

                const day = value[d];
                if (!Array.isArray(day)) {
                    return Optional.of(`Field[${field.name}]: value ${JSON.stringify(value)} `
                        + `is not a valid Schedule- day ${d} must be an array`);
                }

                if (!isNaN(Number(field.maxEntries)) && day.length > Number(field.maxEntries)) {
                    return Optional.of(`Field[${field.name}]: value ${JSON.stringify(value)}`
                        + ` is not a valid Schedule- to many entries for day ${d}`);
                }
                for (const ds of day) {
                    const scheduleDay = asScheduleDay(ds);
                    if (!scheduleDay) {
                        return Optional.of(`Field[${field.name}]: value ${JSON.stringify(value)}`
                            + ` is not a valid Schedule- day ${d} missing properties`);
                    }
                    if (!isValidTime(scheduleDay.start) || !isValidTime(scheduleDay.end)) {
                        return Optional.of(`Field[${field.name}]: value ${JSON.stringify(value)}`
                            + ` is not a valid Schedule- day ${d} invalid start or end time`);
                    }

                    if (field.modes !== undefined && Array.isArray(field.modes) && field.modes.indexOf(scheduleDay.mode) < 0) {
                        return Optional.of(`Field[${field.name}]: value ${JSON.stringify(value)}`
                            + ` is not a valid Schedule- mode ${scheduleDay.mode} not supported`);
                    }

                    if (scheduleDay.position < 0) {
                        return Optional.of(`Field[${field.name}]: value ${JSON.stringify(value)}`
                            + ` is not a valid Schedule- position must be >= 0`);
                    }
                }
            }
        }

        return Optional.empty();
    }
}

interface ScheduleDay {
    start: string;
    end: string;
    mode: string;
    position: number;
}

function asScheduleDay(obj: any): ScheduleDay | undefined {
    if (isScheduleDay(obj)) return obj;
    return undefined;
}

function isScheduleDay(obj: any): obj is ScheduleDay {
    const sd = obj as ScheduleDay;
    return sd.start !== undefined && sd.end !== undefined && sd.mode !== undefined && sd.position !== undefined;
}

function isValidTime(time: string): boolean {
    const parsedTime = time.split(':');
    if (parsedTime.length !== 2) return false;
    const hh = parseInt(parsedTime[0], 10);
    const mm = parseInt(parsedTime[1], 10);
    if (isNaN(hh) || 0 > hh || hh > 23) return false;
    if (isNaN(mm) || 0 > mm || mm > 59) return false;
    return true;
}

export interface Feature {
    properties: Property[];
    actions: FeatureAction[];
    meta: MetaInformation;
    getProperty(name: string): Either<string, Property>;
    getAction(name: string): Either<string, FeatureAction>;
}

export class SirenFeature implements Feature {
    public readonly properties: Property[];
    public readonly actions: FeatureAction[];

    public static of(entity: Entity): Optional<Feature> {
        const meta = getMetaInformation(entity);
        return meta.map(m => new SirenFeature(m, entity));
    }

    public static createFeatures(entity: Entity, enabledOnly: boolean = true): Map<string, SirenFeature> {
        const result: Map<string, SirenFeature> = new Map();
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

    constructor(public readonly meta: MetaInformation, entity: Entity) {
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

    public getProperty(name: string): Either<string, Property> {
        const result = this.properties.find(p => name === p.name);
        if (result) {
            return Either.right(result);
        }
        return Either.left(`Property [${name}] does not exist in Feature[${this.meta.feature}]`);
    }

    public getAction(name: string): Either<string, FeatureAction> {
        const result = this.actions.find(a => name === a.name);
        if (result) {
            return Either.right(result);
        }
        return Either.left(`Action [${name}] does not exist in Feature [${this.meta.feature}]`);
    }
}

function getMetaInformation(entity: Entity): Optional<MetaInformation> {
    if (!isFeature(entity)) {
        return Optional.empty();
    }
    const result = entity.entities
        .filter(e => e.rel.indexOf('http://schema.viessmann.com/link-relations#feature-meta-information') > -1)
        .map(e => e.properties as MetaInformation)
        .filter(m => m.apiVersion !== undefined
            && m.isEnabled !== undefined
            && m.isReady !== undefined
            && m.gatewayId !== undefined
            && m.feature !== undefined
            && m.uri !== undefined
            && m.deviceId !== undefined)[0];

    return Optional.ofNullable(result);
}

function selectLeafFeaturesOf(entity: Entity): Entity[] {
    const grandChildren = entity.entities.map(e => selectLeafFeaturesOf(e));
    const leafs = flatten<Entity>(grandChildren);
    if (isFeatureWithProperties(entity)) {
        leafs.push(entity);
    }
    return leafs;
}

function isFeature(entity: Entity): boolean {
    return entity.hasClass('feature');
}

function isFeatureWithProperties(entity: Entity): boolean {
    return isFeature(entity) && hasProperties(entity);
}

function hasProperties(entity: Entity): boolean {
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

function constructProperty(name: string, raw: any): Optional<Property> {
    if (raw === undefined || raw === null || 'object' !== typeof raw) {
        return Optional.empty();
    }
    const type = raw.type;
    const value = raw.value;
    if (type === undefined || value === undefined) {
        return Optional.empty();
    }
    if (simpleTypes.indexOf(type) > -1) {
        return Optional.of(new SimpleProperty(name, type, value));
    }

    return Optional.of(new ComplexProperty(name, type, value as object));
}

function flatten<P>(arr: any[], result: P[] = []): P[] {
    for (let i = 0, length = arr.length; i < length; i++) {
        const value = (arr[i] as P);
        if (value !== undefined) {
            if (Array.isArray(value)) {
                flatten(value, result);
            } else {
                result.push(value);
            }
        }
    }
    return result;
}
