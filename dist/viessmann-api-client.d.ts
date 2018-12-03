import { ViessmannOAuthConfig, ViessmannOAuthClient } from './oauth-client';
export interface ViessmannClientConfig {
    auth: ViessmannOAuthConfig;
    api: ViessmannAPIURLs;
}
export interface ViessmannAPIURLs {
    host: string;
}
export interface ViessmannInstallation {
    installationId: string;
    gatewayId: string;
    deviceId: string;
}
export declare type FeatureObserver = (any: any) => void;
export declare enum ViessmannFeature {
    EXTERNAL_TEMPERATURE = "heating.sensors.temperature.outside",
    BOILER_TEMPERATURE = "heating.boiler.sensors.temperature.main"
}
export declare class ViessmannClient {
    private readonly oauth;
    private readonly config;
    private readonly installation;
    private observers;
    private scheduler;
    constructor(oauth: ViessmannOAuthClient, config: ViessmannClientConfig, installation: ViessmannInstallation);
    clearObservers(): void;
    getInstallation(): ViessmannInstallation;
    getValue(feature: ViessmannFeature): Promise<any>;
    observe(feature: ViessmannFeature, observer: FeatureObserver): void;
    private basePath;
}
export declare function initializeClient(config: ViessmannClientConfig): Promise<ViessmannClient>;
