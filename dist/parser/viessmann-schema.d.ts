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
export declare function getMetaInformation(entity: Entity): MetaInformation | null;
export declare function isFeature(entity: Entity): boolean;
export declare function isFeatureWithComponents(entity: Entity): boolean;
export declare function hasComponents(entity: Entity): boolean;
export declare function getFeatureName(entity: Entity): string | null;
