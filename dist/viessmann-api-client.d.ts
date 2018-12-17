import { Either } from './lib/either';
import { LoggerFunction } from './logger';
import { Credentials, OAuthClient, ViessmannOAuthConfig } from './oauth-client';
import { Feature, Property } from './parser/viessmann-schema';
export interface ViessmannClientConfig {
    auth: ViessmannOAuthConfig;
    api: ViessmannAPIURLs;
    logger?: LoggerFunction;
    pollInterval?: number;
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
export declare type ConnectionObserver = (connected: boolean) => void;
export declare class Client {
    private readonly config;
    private scheduler;
    private oauth;
    private installation;
    private features;
    private observers;
    private connectionObservers;
    private connected;
    constructor(config: ViessmannClientConfig, oauth?: OAuthClient);
    connect(credentials: Credentials): Promise<Client>;
    private setConnected;
    isConnected(): boolean;
    getInstallation(): ViessmannInstallation;
    getFeatures(): Feature[];
    getFeature(name: string): Either<string, Feature>;
    executeAction(featureName: string, actionName: string, payload?: any): Promise<Either<string, boolean>>;
    observeConnection(observer: ConnectionObserver): void;
    observe(observer: FeatureObserver): void;
    clearObservers(): void;
    private fetchFeatures;
    private fetchFeature;
    private updateObservers;
    private basePath;
    private initInstallation;
}
