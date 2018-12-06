// tslint:disable:no-unused-expression
import { expect } from 'chai';
import 'mocha';

import { Entity } from '../../src/parser/siren';

describe('parser', () => {
    describe('parsing simple response', () => {
        const response = require('../data/testresponse.heating.boiler.sensors.temperature.main');
        const entity = new Entity(response);

        it('should correctly parse rel', () => {
            expect(entity.rel).to.have.length(3);
            expect(entity.rel[0]).to.be.equal('http://schema.viessmann.com/link-relations#feature');
        });

        it('should correctly parse links', () => {
            const links = entity.links;
            expect(links).to.have.length(3);
            expect(links[2]).to.be.deep.equal({
                rel: [
                    'http://schema.viessmann.com/link-relations#live-updates',
                    'https://wiki.viessmann.com/display/VPL/Relations#Relations-live-updates',
                ],
                href: '/operational-data/installations/99999/gateways/123456/devices/0/features/heating.boiler.sensors.temperature.main',
            });
        });

        it('should correctly parse class', () => {
            expect(entity.class).to.be.deep.equal([
                'heating.boiler.sensors.temperature.main',
                'feature',
            ]);
        });
        it('should correctly parse sub entities', () => {
            expect(entity.entities).to.have.length(1);
        });

        it('should correctly parse properties', () => {
            expect(entity.properties).to.be.deep.equal({
                status: {
                    type: 'string',
                    value: 'connected',
                },
                value: {
                    type: 'number',
                    value: 36,
                },
            });
        });
    });

    describe('parsing complex response', () => {
        const response = require('../data/testresponse.features');
        it('should parse the whole response without crashing', () => {
            new Entity(response);
        });
    });
});

describe('entity', () => {

    const entity = new Entity({
        class: ['findMe', 'notChild'],
        entities: [
            {
                rel: ['1'],
                class: ['findMe', 'other'],
            }, {
                rel: ['2'],
                class: ['ignored'],
            }, {
                rel: ['3'],
                class: ['findMe'],
                entities: [
                    {
                        rel: ['3.1'],
                        class: ['ignored'],
                        entities: [{
                            rel: ['3.1.1'],
                            class: ['findMe', 'but not direct child'],
                        }],
                    },
                ],
            },
        ],
    });
    it('should know it´s classes', () => {
        expect(entity.hasClass('findMe')).to.be.true;
        expect(entity.hasClass('not me')).to.be.false;
    });
});
