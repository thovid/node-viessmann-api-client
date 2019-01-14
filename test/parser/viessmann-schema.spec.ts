// tslint:disable:no-unused-expression
import {expect} from 'chai';
import * as chai from 'chai';
import 'mocha';
import {Entity, Field} from '../../src/parser/siren';
import * as viessmann from '../../src/parser/viessmann-schema';

// tslint:disable-next-line:no-var-requires
const chaiSubset = require('chai-subset');
chai.use(chaiSubset);

describe('schema', () => {
    describe('extracting information', () => {
        it('should extract correct meta information', () => {
            const response = require('../data/testresponse.heating.boiler.sensors.temperature.main');
            const entity = new Entity(response);
            const metainformation = getMetaInformationOf(entity);
            expect(metainformation).to.containSubset({
                apiVersion: 1,
                isEnabled: true,
                isReady: true,
                gatewayId: '123456',
                feature: 'heating.boiler.sensors.temperature.main',
                uri: '/v1/gateways/123456/devices/0/features/heating.boiler.sensors.temperature.main',
                deviceId: '0',
            });
        });

        it('should not give meta information for non-feature entity', () => {
            const entity = new Entity({
                class: ['some class'],
            });
            expect(getMetaInformationOf(entity)).to.be.null;
        });

        it('should not give meta information for feature entity without meta information child', () => {
            const entity = new Entity({
                class: ['feature', 'some-feature'],
                entities: [
                    {
                        rel: ['some-rel'],
                    },
                ],
            });
            expect(getMetaInformationOf(entity)).to.be.null;
        });

        it('should not give meta information for feature entity with meta information child that lacks properties', () => {
            const entity = new Entity({
                class: ['feature', 'some-feature'],
                entities: [
                    {
                        rel: ['http://schema.viessmann.com/link-relations#feature-meta-information'],
                        properties: {
                            apiVersion: 1,
                            isEnabled: true,
                        },
                    },
                ],
            });
            expect(getMetaInformationOf(entity)).to.be.null;
        });
    });

    describe('finding features', () => {
        it('should select all leaf features', () => {
            const entity = aComplexEntity(false);

            const foundFeatures = selectLeafEntitiesOf(entity)
                .map(f => f.meta.feature);
            expect(foundFeatures).to.be.deep.equal(['leaf']);
        });

        it('should select enabled leaf features if requested', () => {
            const enabledEntity = aComplexEntity(true);
            const disabledEntity = aComplexEntity(false);
            const foundEnabledFeatures = selectLeafEntitiesOf(enabledEntity, true)
                .map(f => f.meta.feature);
            const foundDisabledFeatures = selectLeafEntitiesOf(disabledEntity, true)
                .map(f => f.meta.feature);
            expect(foundEnabledFeatures).to.be.deep.equal(['leaf']);
            expect(foundDisabledFeatures).to.be.empty;
        });
    });

    describe('extracting properties', () => {
        it('should extract a simple property', () => {
            const entity = new Entity({
                properties: {
                    active: {
                        type: 'boolean',
                        value: true,
                    },
                },
            });
            const feature = new viessmann.SirenFeature(defaultMetaInformation, entity);

            const properties = feature.properties;
            expect(properties).to.have.length(1);
            expect(properties[0]).to.have.property('type', 'boolean');
            expect(properties[0]).to.have.property('value', true);
            expect(properties[0]).to.have.property('name', 'active');

        });
        it('should extract a complex property', () => {
            const entity = new Entity({
                properties: {
                    something: {
                        type: 'Complex',
                        value: {
                            attr1: 'some attr',
                            attr2: 'some other attr',
                        },
                    },
                },
            });
            const feature = new viessmann.SirenFeature(defaultMetaInformation, entity);

            const properties = feature.properties;
            expect(properties).to.have.length(1);
            expect(properties[0]).to.have.property('name', 'something');
            expect(properties[0]).to.have.property('type', 'object');
            expect(properties[0]).to.have.property('customType', 'Complex');
            expect(properties[0].value).to.be.deep.equal({
                attr1: 'some attr',
                attr2: 'some other attr',
            });
        });
    });

    describe('validating action payloads', async () => {
        it('should validate required field', async () => {
            const action = actionWithField({
                name: 'targetTemperature',
                required: true,
                type: 'number',
            });

            expect(action.validated({targetTemperature: 10}).toRight().isPresent).to.be.true;
            expect(action.validated({someProp: 10}).toRight().isPresent).to.be.false;
        });

        it('should validate simple type', async () => {
            const action = actionWithField({
                name: 'targetTemperature',
                required: true,
                type: 'number',
            });

            expect(action.validated({targetTemperature: '10'}).toRight().isPresent).to.be.false;
        });

        it('should validate special number constraints', async () => {
            const action = actionWithField({
                name: 'targetTemperature',
                required: true,
                type: 'number',
                min: 4.1,
                max: 37,
                stepping: 0.1,
            });

            expect(action.validated({targetTemperature: 4}).toRight().isPresent, '4 less than min').to.be.false;
            expect(action.validated({targetTemperature: 38}).toRight().isPresent, '38 greater then max').to.be.false;
            expect(action.validated({targetTemperature: 20.05}).toRight().isPresent, '20.05 not matching stepping').to.be.false;

            expect(action.validated({targetTemperature: 4.1}).toRight().isPresent, '4.1 equals min').to.be.true;
            expect(action.validated({targetTemperature: 4.7}).toRight().isPresent, '4.7 matches stepping').to.be.true;
            expect(action.validated({targetTemperature: 36.9}).toRight().isPresent, '46.9 matches stepping').to.be.true;
            expect(action.validated({targetTemperature: 37}).toRight().isPresent, '37 equals max').to.be.true;
        });

        it('should validate special string constraints', async () => {
            const action = actionWithField({
                name: 'mode',
                required: true,
                type: 'string',
                enum: [
                    'standby',
                    'dhw',
                    'dhwAndHeating',
                    'forcedReduced',
                    'forcedNormal',
                ],
            });

            expect(action.validated({mode: 'standby'}).toRight().isPresent, 'standby is valid enum value').to.be.true;
            expect(action.validated({mode: 'something'}).toRight().isPresent, 'something is not valid enum value').to.be.false;
        });
    });
});

const defaultMetaInformation = null;

function actionWithField(field: Field): viessmann.FeatureAction {
    return new viessmann.FeatureAction({
        method: 'POST',
        isExecutable: true,
        href: 'someref/setTemperature',
        name: 'setTemperature',
        fields: [
            field,
        ],
        type: 'application/json',
    });
}

function getMetaInformationOf(entity: Entity): viessmann.MetaInformation {
    const features = viessmann.SirenFeature.createFeatures(entity);
    if (features.size > 0) {
        return Array.from(features.values())[0].meta;
    }
    return null;
}

function selectLeafEntitiesOf(entity: Entity, onlyEnabled: boolean = false): viessmann.SirenFeature[] {
    const features = viessmann.SirenFeature.createFeatures(entity, onlyEnabled);
    if (features.size > 0) {
        return Array.from(features.values());
    }
    return [];
}

function aComplexEntity(enabled: boolean): Entity {
    return new Entity(
        {
            rel: ['root'],
            entities: [
                {
                    rel: ['middle'],
                    class: ['feature', 'notleaf'],
                    entities: [
                        {
                            rel: ['component'],
                            properties: {
                                components: [
                                    'time',
                                ],
                            },
                        },
                    ],
                }, {
                    rel: ['leaf'],
                    class: ['feature', 'leaf'],
                    properties: {
                        some: 'property',
                    },
                    entities: [{
                        rel: ['http://schema.viessmann.com/link-relations#feature-meta-information'],
                        properties: {
                            apiVersion: 1,
                            isEnabled: enabled,
                            isReady: true,
                            gatewayId: '123456',
                            feature: 'leaf',
                            uri: '/some/uri/leaf',
                            deviceId: '0',
                        },
                    }],
                },
            ],
        });
}
