import { ViessmannOAuthConfig, UserCredentials, TokenCredentials } from './oauth-client';
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
export declare class NotConnected extends Error {
    constructor();
}
export declare class Client {
    private readonly config;
    private scheduler;
    private oauth;
    private installation;
    private observers;
    private connected;
    constructor(config: ViessmannClientConfig);
    connect(credentials: UserCredentials | TokenCredentials): Promise<void>;
    isConnected(): boolean;
    getInstallation(): ViessmannInstallation;
    getValue(feature: ViessmannFeature): Promise<any>;
    observe(feature: ViessmannFeature, observer: FeatureObserver): void;
    clearObservers(): void;
    private basePath;
    private initInstallation;
}
