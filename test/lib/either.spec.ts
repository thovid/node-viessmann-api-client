// tslint:disable:no-unused-expression
import {expect} from 'chai';
import 'mocha';

import {Either, either} from '../../src/lib/either';

describe('Either', () => {

    it('Case of', () => {

        expect(Either.left<string, number>('on noes')
            .caseOf({
                left: s => true,
                right: n => false,
            })).to.be.true;

        expect(Either.right<string, number>(1)
            .caseOf({
                left: s => false,
                right: n => true,
            })).to.be.true;
    });

    it('isLeft', () => {
        expect(Either.left(2).isLeft()).to.be.true;

        expect(Either.right(2).isLeft()).to.be.false;
    });

    it('isRight', () => {
        expect(Either.right(2).isRight()).to.be.true;

        expect(Either.left(2).isRight()).to.be.false;
    });

    it('flatMap', () => {

        expect(Either.right<string, number>(2)
            .flatMap(n => Either.right<string, number>(n * 2))
            .flatMap(n => Either.right<string, number>(n * 2))
            .caseOf({
                left: s => false,
                right: n => n === 8,
            })).to.be.true;

        expect(Either.right<string, number>(2)
            .flatMap(n => Either.right<string, number>(n * 2))
            .flatMap(n => Either.left<string, number>('nooo'))
            .caseOf({
                left: s => s === 'nooo',
                right: n => false,
            })).to.be.true;
    });

    it('map', () => {

        expect(Either.right<string, number>(2)
            .map(n => n * 2)
            .map(n => n * 2)
            .caseOf({
                left: s => false,
                right: n => n === 8,
            })).to.be.true;

        expect(Either.right<string, number>(2)
            .map(n => n * 2)
            .map(n => null)
            .caseOf({
                left: s => false,
                right: n => !n,
            })).to.be.true;
    });

    it('Constructors', () => {

        expect(either<string, number>('oh noes')
            .caseOf({
                left: s => s === 'oh noes',
                right: n => false,
            })).to.be.true;

        expect(either<string, number>(null, 123)
            .caseOf({
                left: s => false,
                right: n => n === 123,
            })).to.be.true;

        expect(() => either('not both', 123)).to.throw(TypeError);
        expect(() => either<string, number>()).to.throw(TypeError);
    });

    it('toRight', () => {
        expect(either<string, number>('oh noes').toRight().isPresent).to.be.false;
        expect(either<string, number>(null, 123).toRight().get()).to.be.equal(123);
    });

    it('toLeft', () => {
        expect(either<string, number>('oh noes').toLeft().get()).to.be.equal('oh noes');
        expect(either<string, number>(null, 123).toLeft().isPresent).to.be.false;
    });
});
