import { Siren, SubEntity, EmbeddedLink, EmbeddedRepr } from "siren-types";
const sirenParser = require('siren-parser');

const featuresFile = require('../data/testresponse.features.json');

const name = 'heating.sensors.temperature.outside';
const root: Siren = sirenParser(featuresFile);
const result = new Map<string, EmbeddedRepr>();
root.entities.forEach((entity) => findEntitiesWithClass(entity, name, result));
const value = result.get(name).properties['value'];
console.log(JSON.stringify(value));


// FIXME doesn't work because Siren does not allow type 'Schedule' in Actions.Field, but Viessmann
// uses this type for certain endpoints
function findEntitiesWithClass(root: SubEntity, className: string, results: Map<string, EmbeddedRepr>): void {
    if (!root || !isEmbeddedRep(root)) {
        return;
    }
    if (hasClass(root, className)) {
        results.set(className, root);
    }
    if (root.entities) {
        root.entities.forEach((entity) => findEntitiesWithClass(entity, className, results));
    }
}

function hasClass(entity: SubEntity, className: string): boolean {
    return entity.class !== undefined && (-1 < entity.class.indexOf(className));
}

function getValueOf(entity: SubEntity): any {
    if (isEmbeddedRep(entity) &&
        entity.properties !== undefined &&
        entity.properties['value'] !== undefined) {
        return entity.properties['value'];
    }

    return null;
}

function isEmbeddedRep(entity: SubEntity): entity is EmbeddedRepr {
    return (<EmbeddedLink>entity).href === undefined;
}