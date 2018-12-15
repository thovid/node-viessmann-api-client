import Optional from 'typescript-optional';
import { Action, Entity } from './siren';
export interface MetaInformation {
    apiVersion: number;
    isEnabled: boolean;
    isReady: boolean;
    gatewayId: string;
    feature: string;
    uri: string;
    deviceId: string;
}
export interface Property {
    name: string;
    type: string;
    value: any;
}
export declare class SimpleProperty implements Property {
    readonly name: string;
    readonly type: string;
    readonly value: any;
    constructor(name: string, type: string, value: any);
}
export declare class ComplexProperty implements Property {
    readonly name: string;
    readonly customType: string;
    readonly value: object;
    readonly type: string;
    constructor(name: string, customType: string, value: object);
}
export declare class FeatureAction extends Action {
    constructor(action: Action);
    validated(payload?: any): Optional<FeatureAction>;
    private validateField;
}
export interface Feature {
    properties: Property[];
    actions: FeatureAction[];
    meta: MetaInformation;
    getProperty(name: string): Optional<Property>;
    getAction(name: string): Optional<FeatureAction>;
}
export declare class SirenFeature implements Feature {
    readonly meta: MetaInformation;
    readonly properties: Property[];
    readonly actions: FeatureAction[];
    static of(entity: Entity): Optional<Feature>;
    static createFeatures(entity: Entity, enabledOnly?: boolean): Map<string, SirenFeature>;
    constructor(meta: MetaInformation, entity: Entity);
    getProperty(name: string): Optional<Property>;
    getAction(name: string): Optional<FeatureAction>;
}
