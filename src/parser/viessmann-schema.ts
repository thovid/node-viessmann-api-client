import { Entity } from './siren';

export interface MetaInformation {
    apiVersion: number;
    isEnabled: boolean;
    isReady: boolean;
    gatewayId: string;
    feature: string;
    uri: string;
    deviceId: string;
};

export interface Property {
    name: string;
    type: string;
    value: any;
};

export class SimpleProperty implements Property {
    constructor(public readonly name: string, public readonly type: string, public readonly value: any) { }
}

export class ComplexProperty implements Property {
    public readonly type: string;
    constructor(public readonly name: string, public readonly customType: string, public readonly value: Object) {
        this.type = 'object';
    }
}

export class Feature {
    public readonly properties: Property[];

    public static createFeatures(entity: Entity, enabledOnly: boolean = true): Map<string, Feature> {
        const result: Map<string, Feature> = new Map();
        selectLeafFeaturesOf(entity)
            .map(e => {
                const meta = getMetaInformation(e);
                return meta !== null ? new Feature(meta, e) : null;
            }).filter(f => {
                return (f !== null && (!enabledOnly || f.meta.isEnabled));
            })
            .forEach(f => result.set(f.meta.feature, f));
        return result;
    }

    constructor(public readonly meta: MetaInformation, public readonly entity: Entity) {
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
    if (isLeaf(entity)) {
        leafs.push(entity);
    }
    return leafs;
}

function isFeature(entity: Entity): boolean {
    return entity.hasClass('feature');
}

function isLeaf(entity: Entity): boolean {
    return isFeature(entity) && !hasComponents(entity);
}

function hasComponents(entity: Entity): boolean {
    return entity.entities
        .filter(e => e.properties !== undefined
            && e.properties.components !== undefined
            && Array.isArray(e.properties.components)).length > 0;
}

const simpleTypes = ['string', 'number', 'boolean'];

function constructProperty(name: string, raw: any): Property | null {
    if (raw === undefined || raw === null || 'object' !== typeof raw) {
        return null;
    }
    const type = raw['type'];
    const value = raw['value'];
    if (type === undefined || value === undefined) {
        return null;
    }
    if (simpleTypes.indexOf(type) > -1) {
        return new SimpleProperty(name, type, value);
    } 
    return new ComplexProperty(name, type, value as Object);
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
};