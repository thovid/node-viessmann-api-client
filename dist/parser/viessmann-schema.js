"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
class SirenFeature {
    constructor(meta, entity) {
        this.meta = meta;
        this.entity = entity;
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
    static createFeatures(entity, enabledOnly = true) {
        const result = new Map();
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
    getProperty(name) {
        const result = this.properties.find(p => name === p.name);
        return result || null;
    }
}
exports.SirenFeature = SirenFeature;
function getMetaInformation(entity) {
    if (!isFeature(entity)) {
        return null;
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
    return result ? result : null;
}
function selectLeafFeaturesOf(entity) {
    const grandChildren = entity.entities.map(e => selectLeafFeaturesOf(e));
    const leafs = flatten(grandChildren, []);
    if (isLeaf(entity)) {
        leafs.push(entity);
    }
    return leafs;
}
function isFeature(entity) {
    return entity.hasClass('feature');
}
function isLeaf(entity) {
    return isFeature(entity) && !hasComponents(entity);
}
function hasComponents(entity) {
    return entity.entities
        .filter(e => e.properties !== undefined
        && e.properties.components !== undefined
        && Array.isArray(e.properties.components)).length > 0;
}
const simpleTypes = ['string', 'number', 'boolean'];
function constructProperty(name, raw) {
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
    return new ComplexProperty(name, type, value);
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