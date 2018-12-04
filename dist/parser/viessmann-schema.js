"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
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
exports.getMetaInformation = getMetaInformation;
function isFeature(entity) {
    return entity.hasClass('feature');
}
exports.isFeature = isFeature;
function isFeatureWithComponents(entity) {
    return isFeature(entity) && hasComponents(entity);
}
exports.isFeatureWithComponents = isFeatureWithComponents;
function hasComponents(entity) {
    return entity.entities
        .filter(e => e.properties !== undefined
        && e.properties.components !== undefined
        && Array.isArray(e.properties.components)).length > 0;
}
exports.hasComponents = hasComponents;
function getFeatureName(entity) {
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
exports.getFeatureName = getFeatureName;
//# sourceMappingURL=viessmann-schema.js.map