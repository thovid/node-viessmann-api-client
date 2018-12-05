import * as helper from '../../src/parser/viessmann-schema';
import { Entity } from '../../src/parser/siren';

const allFeatures = require('../data/testresponse.features.json');

const parsed = new Entity(allFeatures);
const features = helper.Feature.createFeatures(parsed, true);
console.log(`found ${features.size} active features:`);

Array.from(features.values()).forEach(f => console.log(JSON.stringify(f)));