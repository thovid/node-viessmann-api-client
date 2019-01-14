// tslint:disable:no-console
import {Entity} from '../../src/parser/siren';
import * as helper from '../../src/parser/viessmann-schema';

// tslint:disable-next-line:no-var-requires
const allFeatures = require('../data/testresponse.features.json');

const parsed = new Entity(allFeatures);
const features = helper.SirenFeature.createFeatures(parsed, true);
console.log(`found ${features.size} active features:`);

const results = Array.from(features.values())
    .map(f => {
        return {
            name: f.meta.feature,
            // properties: f.properties,
            actions: f.actions,
        };
    }).filter(f => f.actions.length > 0);
    console.log(JSON.stringify(results));
    // .forEach(f => console.log(JSON.stringify(f)));
