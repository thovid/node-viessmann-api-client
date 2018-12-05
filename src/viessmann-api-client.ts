import { log } from './logger';
import { Scheduler } from './scheduler';
import { Entity } from './parser/siren';
import { Feature } from './parser/viessmann-schema';
import { ViessmannOAuthConfig, createOAuthClient, ViessmannOAuthClient, UserCredentials, TokenCredentials } from './oauth-client';


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

export class NotConnected extends Error {
    constructor() {
        super('the Viessmann API Client is currently not connected');
        Object.setPrototypeOf(this, NotConnected.prototype);
    }
}

export class Client {

    private scheduler: Scheduler;
    private oauth: ViessmannOAuthClient;
    private installation: ViessmannInstallation;
    private features: Map<string, Feature>;

    private observers: Map<ViessmannFeature, FeatureObserver> = new Map<ViessmannFeature, FeatureObserver>();
    private connected: boolean = false;

    constructor(private readonly config: ViessmannClientConfig) {
        this.scheduler = new Scheduler(60, () => {
            this.observers.forEach((obs, feature) => {
                this.getValue(feature)
                    .then(res => obs(res))
                    .catch((err) => log(`ViessmannClient: Error [${err}] during update of observer for [${feature}]`, 'error'));
            });
        });
    }

    public async connect(credentials: UserCredentials | TokenCredentials): Promise<void> {
        return createOAuthClient(this.config.auth)
            .then(oauth => {
                this.oauth = oauth;
                return this.initInstallation();
            }).then(() => this.fetchFeatures())
            .then(() => {
                log(`ViessmannClient: initialized with installation=${JSON.stringify(this.installation)}`, 'info');
                this.connected = true;
            });
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public getInstallation(): ViessmannInstallation {
        return this.installation;
    }

    public getFeature(name: string): Feature | null {
        return this.features.get(name);
    }

    public async getValue(feature: ViessmannFeature): Promise<any> {
        log(`ViessmannClient: getting property ${feature}`, 'debug');
        const basePath = this.basePath();
        return this.oauth
            .authenticatedGet(basePath + '/' + feature)
            .then((response) => new Entity(response))
            .then((entity: Entity) => entity.properties['value']['value']);
    }

    public observe(feature: ViessmannFeature, observer: FeatureObserver): void {
        this.observers.set(feature, observer);
        this.scheduler.start();
    }

    public clearObservers(): void {
        this.observers.clear();
        this.scheduler.stop();
    }

    private async fetchFeatures(): Promise<Map<string, Feature>> {
        return this.oauth
            .authenticatedGet(this.basePath())
            .then((response) => new Entity(response))
            .then((entity) => Feature.createFeatures(entity, true))
            .then((features) => this.features = features);

    }

    private basePath(): string {
        return this.config.api.host
            + '/operational-data/installations/' + this.installation.installationId
            + '/gateways/' + this.installation.gatewayId
            + '/devices/' + this.installation.deviceId
            + '/features';
    }

    private async initInstallation(): Promise<void> {
        log('ViessmannClient: requesting installation details during initialization', 'debug');
        return this.oauth.authenticatedGet(this.config.api.host + '/general-management/installations')
            .then((body) => new Entity(body))
            .then((entity) => {
                const installation: Entity = entity.entities[0];
                const installationId: string = installation.properties['_id'];
                const modelDevice: Entity = installation.entities[0];
                const gatewayId: string = modelDevice.properties['serial'];

                this.installation = {
                    installationId: installationId,
                    gatewayId: gatewayId,
                    deviceId: '0'
                }
            });
    };
}
