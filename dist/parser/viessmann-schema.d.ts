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
export interface Feature {
    properties: Property[];
    meta: MetaInformation;
    getProperty(name: string): Property | null;
}
export declare class SirenFeature implements Feature {
    readonly meta: MetaInformation;
    readonly entity: Entity;
    readonly properties: Property[];
    static createFeatures(entity: Entity, enabledOnly?: boolean): Map<string, SirenFeature>;
    constructor(meta: MetaInformation, entity: Entity);
    getProperty(name: string): Property | null;
}
