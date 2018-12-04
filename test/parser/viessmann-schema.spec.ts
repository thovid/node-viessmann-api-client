import { expect } from 'chai';
import * as chai from 'chai';
import 'mocha';
import { Entity } from '../../src/parser/siren';
import * as viessmann from '../../src/parser/viessmann-schema';

var chaiSubset = require('chai-subset');
chai.use(chaiSubset);

describe('schema', () => {
    describe('finding feature', () => {
        it('should find the feature name', () => {
            const response = require('../data/testresponse.heating.boiler.sensors.temperature.main');
            const entity = new Entity(response);
            expect(viessmann.getFeatureName(entity)).to.be.equal('heating.boiler.sensors.temperature.main');
        });

        it('should handle non-feature entity', () => {
            const entity = new Entity({
                class: ['some-class']
            });
            expect(viessmann.getFeatureName(entity)).to.be.null;
        });

        it('should handle malformatted entity', () => {
            const entity = new Entity({
                class: ['feature']
            });
            expect(viessmann.getFeatureName(entity)).to.be.null;
        });
    });

    describe('extracting information', () => {
        it('should extract correct meta information', () => {
            const response = require('../data/testresponse.heating.boiler.sensors.temperature.main');
            const entity = new Entity(response);
            const metainformation = viessmann.getMetaInformation(entity);
            expect(metainformation).to.containSubset({
                apiVersion: 1,
                isEnabled: true,
                isReady: true,
                gatewayId: '123456',
                feature: 'heating.boiler.sensors.temperature.main',
                uri: '/v1/gateways/123456/devices/0/features/heating.boiler.sensors.temperature.main',
                deviceId: '0'
            });
        });

        it('should not give meta information for non-feature entity', () => {
            const entity = new Entity({
                class: ['some class']
            });
            expect(viessmann.getMetaInformation(entity)).to.be.null;
        });

        it('should not give meta information for feature entity without meta information child', () => {
            const entity = new Entity({
                class: ['feature', 'some-feature'],
                entities: [
                    {
                        rel: ['some-rel']
                    }
                ]
            });

            expect(viessmann.getMetaInformation(entity)).to.be.null;
        });

        it('should not give meta information for feature entity with meta information child that lacks properties', () => {
            const entity = new Entity({
                class: ['feature', 'some-feature'],
                entities: [
                    {
                        rel: ['http://schema.viessmann.com/link-relations#feature-meta-information'],
                        properties: {
                            apiVersion: 1,
                            isEnabled: true
                        }
                    }
                ]
            });
            expect(viessmann.getMetaInformation(entity)).to.be.null;
        });
    });

    describe('testing components', () => {
        it('should identify entity with components', () => {
            const entity = new Entity({
                class: [
                    'heating.device',
                    'feature'
                ],
                properties: {},
                entities: [
                    {
                        rel: [
                            'http://schema.viessmann.com/link-relations#feature-meta-information',
                        ],
                        properties: {
                            apiVersion: 1,
                            isEnabled: true,
                            isReady: true,
                            gatewayId: '666',
                            feature: 'heating.device',
                            uri: '/v1/gateways/666/devices/0/features/heating.device',
                            deviceId: '0'
                        }
                    },
                    {
                        rel: [
                            'http://schema.viessmann.com/link-relations#time',
                        ],
                        href: 'https://api.viessmann-platform.io/operational-data/installations/42216/gateways/666/devices/0/features/heating.device.time'
                    },
                    {
                        rel: [
                            'http://schema.viessmann.com/link-relations#feature-components',
                        ],
                        properties: {
                            components: [
                                'time'
                            ]
                        }
                    }
                ]
            });
        });
    });
});