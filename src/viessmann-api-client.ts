import { Siren } from "siren-types";
import { log } from './logger';
const sirenParser = require('siren-parser');

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

export class ViessmannClient {

    constructor(private readonly oauth: ViessmannOAuthClient,
        private readonly config: ViessmannClientConfig,
        private readonly installation: ViessmannInstallation) {
        log(`ViessmannClient: initialized with installation=${JSON.stringify(installation)}`, 'info');
    }

    public getInstallation(): ViessmannInstallation {
        return this.installation;
    }

    public async getExternalTemperature(): Promise<number> {
        return this.getProperty('heating.sensors.temperature.outside');
    }

    public async getBoilerTemperature(): Promise<number> {
        return this.getProperty('heating.boiler.sensors.temperature.main');
    }

    private async getProperty(feature: string): Promise<any> {
        log(`ViessmannClient: getting property ${feature}`, 'debug');
        const basePath = this.basePath();
        return this.oauth
            .authenticatedGet(basePath + feature)
            .then((response) => sirenParser(response))
            .then((entity: Siren) => entity.properties['value']['value']);
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
    return new ViessmannInitializer(config).initialize();
}

class ViessmannInitializer {
    constructor(private readonly config: ViessmannClientConfig) {
    }

    public async initialize(): Promise<ViessmannClient> {
        return createOAuthClient(this.config.auth)
            .then((authClient) => this.initInstallation(authClient));
    }

    private async initInstallation(authClient: ViessmannOAuthClient): Promise<ViessmannClient> {
        log('ViessmannClient: requesting installation details during initialization' , 'debug');
        return authClient.authenticatedGet(this.config.api.host + '/general-management/installations')
            .then((body) => sirenParser(body))
            .then((entity) => {
                const installation: Siren = entity.entities[0];
                const installationId: string = installation.properties['_id'];
                const modelDevice: Siren = installation.entities[0];
                const gatewayId: string = modelDevice.properties['serial'];

                const result = {
                    installationId: installationId,
                    gatewayId: gatewayId,
                    deviceId: '0'
                }
                return new ViessmannClient(authClient, this.config, result);
            });
    }
}

