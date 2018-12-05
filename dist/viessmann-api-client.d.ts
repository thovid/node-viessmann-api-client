import { LoggerFunction } from './logger';
import { Feature } from './parser/viessmann-schema';
import { ViessmannOAuthConfig, Credentials } from './oauth-client';
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
export declare type FeatureObserver = (Feature: any, Property: any) => void;
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
