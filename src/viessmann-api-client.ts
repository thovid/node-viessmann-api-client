import { log } from './logger';
import { Scheduler } from './scheduler';
import { Entity } from './parser/siren';

import { ViessmannOAuthConfig, createOAuthClient, ViessmannOAuthClient } from './oauth-client';

export interface ViessmannClientConfig {
    auth: ViessmannOAuthConfig
    api: ViessmannAPIURLs;
}

export interface ViessmannAPIURLs {
    host: string
}

export interface ViessmannInstallation {
    installationId: string
    gatewayId: string
    deviceId: string
}

export type FeatureObserver = (any) => void;

export enum ViessmannFeature {
    EXTERNAL_TEMPERATURE = 'heating.sensors.temperature.outside',
    BOILER_TEMPERATURE = 'heating.boiler.sensors.temperature.main'
}

export class ViessmannClient {

    private observers: Map<ViessmannFeature, FeatureObserver> = new Map<ViessmannFeature, FeatureObserver>();
    private scheduler: Scheduler;

    constructor(private readonly oauth: ViessmannOAuthClient,
        private readonly config: ViessmannClientConfig,
        private readonly installation: ViessmannInstallation) {
        log(`ViessmannClient: initialized with installation=${JSON.stringify(installation)}`, 'info');

        this.scheduler = new Scheduler(60, () => {
            this.observers.forEach((obs, feature) => {
                this.getValue(feature)
                    .then(res => obs(res))
                    .catch((err) => log(`ViessmannClient: Error [${err}] during update of observer for [${feature}]`, 'error'));
            });
        });
    }

    public clearObservers(): void {
        this.observers.clear();
        this.scheduler.stop();
    }

    public getInstallation(): ViessmannInstallation {
        return this.installation;
    }

    public async getValue(feature: ViessmannFeature): Promise<any> {
        log(`ViessmannClient: getting property ${feature}`, 'debug');
        const basePath = this.basePath();
        return this.oauth
            .authenticatedGet(basePath + feature)
            .then((response) => new Entity(response))
            .then((entity: Entity) => entity.properties['value']['value']);
    }

    public observe(feature: ViessmannFeature, observer: FeatureObserver): void {
        this.observers.set(feature, observer);
        this.scheduler.start();
    }

    private basePath(): string {
        return this.config.api.host
            + '/operational-data/installations/' + this.installation.installationId
            + '/gateways/' + this.installation.gatewayId
            + '/devices/' + this.installation.deviceId
            + '/features/';
    }
}

export async function initializeClient(config: ViessmannClientConfig): Promise<ViessmannClient> {
    return createOAuthClient(config.auth)
        .then((authClient) => initInstallation(authClient, config));
}

async function initInstallation(authClient: ViessmannOAuthClient, config: ViessmannClientConfig): Promise<ViessmannClient> {
    log('ViessmannClient: requesting installation details during initialization', 'debug');
    return authClient.authenticatedGet(config.api.host + '/general-management/installations')
        .then((body) => new Entity(body))
        .then((entity) => {
            const installation: Entity = entity.entities[0];
            const installationId: string = installation.properties['_id'];
            const modelDevice: Entity = installation.entities[0];
            const gatewayId: string = modelDevice.properties['serial'];

            const result = {
                installationId: installationId,
                gatewayId: gatewayId,
                deviceId: '0'
            }
            return new ViessmannClient(authClient, config, result);
        });
};
