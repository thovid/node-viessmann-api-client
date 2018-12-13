import {Entity} from './siren';

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

export interface Feature {
    properties: Property[];
    meta: MetaInformation;
    getProperty(name: string): Property | null;
}

export class SirenFeature implements Feature {
    public readonly properties: Property[];

    public static createFeatures(entity: Entity, enabledOnly: boolean = true): Map<string, SirenFeature> {
        const result: Map<string, SirenFeature> = new Map();
        selectLeafFeaturesOf(entity)
            .map(e => {
                const meta = getMetaInformation(e);
                return meta !== null ? new SirenFeature(meta, e) : null;
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
                .filter(p => p !== null);
        }
        this.properties = properties;
    }

    public getProperty(name: string): Property | null {
        const result = this.properties.find(p => name === p.name);
        return result || null;
    }
}

function getMetaInformation(entity: Entity): MetaInformation | null {
    if (!isFeature(entity)) {
        return null;
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

    return result ? result : null;
}

function selectLeafFeaturesOf(entity: Entity): Entity[] {
    const grandChildren = entity.entities.map(e => selectLeafFeaturesOf(e));
    const leafs = flatten(grandChildren, []);
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

function constructProperty(name: string, raw: any): Property | null {
    if (raw === undefined || raw === null || 'object' !== typeof raw) {
        return null;
    }
    const type = raw.type;
    const value = raw.value;
    if (type === undefined || value === undefined) {
        return null;
    }
    if (simpleTypes.indexOf(type) > -1) {
        return new SimpleProperty(name, type, value);
    }

    return new ComplexProperty(name, type, value as object);
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
