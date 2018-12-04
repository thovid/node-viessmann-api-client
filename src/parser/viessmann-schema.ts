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

export function getMetaInformation(entity: Entity): MetaInformation | null {
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

export function selectLeafFeaturesOf(entity: Entity): Entity[] {
    const grandChildren = entity.entities.map(e => selectLeafFeaturesOf(e));
    const leafs = flatten(grandChildren, []);
    if (isLeaf(entity)) {
        leafs.push(entity);
    }
    return leafs;
}

export function getFeatureName(entity: Entity): string | null {
    if (!isFeature(entity)) {
        return null;
    }

    const index = entity.class.indexOf('feature');
    if (entity.class.length < 2 || index < 0) {
        return null;
    }
    const tmpClasses = entity.class.slice(0, index).concat(entity.class.slice(index + 1));
    return tmpClasses[0];
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