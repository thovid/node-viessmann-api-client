import { LoggerFunction } from './logger';
import { Credentials, ViessmannOAuthConfig } from './oauth-client';
import { Feature, Property } from './parser/viessmann-schema';
export interface ViessmannClientConfig {
    auth: ViessmannOAuthConfig;
    api: ViessmannAPIURLs;
    logger?: LoggerFunction;
}
export interface ViessmannAPIURLs {
    host: string;
}
export interface ViessmannInstallation {
    installationId: string;
    gatewayId: string;
    deviceId: string;
}
export declare type FeatureObserver = (f: Feature, p: Property) => void;
export declare class Client {
    private readonly config;
    private scheduler;
    private oauth;
    private installation;
    private features;
    private observers;
    private connected;
    constructor(config: ViessmannClientConfig);
    connect(credentials: Credentials): Promise<Client>;
    isConnected(): boolean;
    getInstallation(): ViessmannInstallation;
    getFeature(name: string): Feature | null;
    observe(observer: FeatureObserver): void;
    clearObservers(): void;
    private fetchFeatures;
    private basePath;
    private initInstallation;
}
