import { Entity } from './siren';
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
    readonly value: Object;
    readonly type: string;
    constructor(name: string, customType: string, value: Object);
}
export declare class Feature {
    readonly meta: MetaInformation;
    readonly entity: Entity;
    private readonly properties;
    static createFeatures(entity: Entity, enabledOnly?: boolean): Map<string, Feature>;
    constructor(meta: MetaInformation, entity: Entity);
    getProperties(): Property[];
}
