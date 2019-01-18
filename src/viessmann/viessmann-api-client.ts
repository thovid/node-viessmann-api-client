import Optional from 'typescript-optional';
import {Either, leftPromiseTransformer} from '../lib/either';

import {log, LoggerFunction, setCustomLogger} from '../lib/logger';
import {Scheduler} from '../lib/scheduler';
import {Entity} from '../parser/siren';
import {Credentials, OAuthClient, ViessmannOAuthConfig} from './oauth-client';
import {Feature, Property, SirenFeature} from './viessmann-schema';

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

export type FeatureObserver = (f: Feature, p: Property) => void;
export type ConnectionObserver = (connected: boolean) => void;

export class Client {
    private scheduler: Scheduler;
    private oauth: OAuthClient;
    private installation: ViessmannInstallation;

    private features: Map<string, Feature> = new Map<string, Feature>();
    private observers: FeatureObserver[] = [];
    private connectionObservers: ConnectionObserver[] = [];
    private connected: boolean = false;

    constructor(private readonly config: ViessmannClientConfig, oauth?: OAuthClient) {
        setCustomLogger(config.logger);
        this.oauth = oauth !== undefined ? oauth : new OAuthClient(config.auth);
        const pollInterval = config.pollInterval !== undefined ? config.pollInterval : 60000;
        log(`ViessmannClient: initializing with pollIntervall ${pollInterval}`);
        this.scheduler = new Scheduler(pollInterval, async () => {
            log('ViessmannClient: polling for updates...', 'debug');
            this.fetchFeatures()
                .then(features => Array.from(features.values()))
                .then(features => features
                    .forEach(f => this.updateObservers(f)))
                .then(() => {
                    this.setConnected(true);
                })
                .catch(err => {
                    const message = err.message || 'unknown error';
                    log(`ViessmannClient: error fetching features: ${message}`);
                    log(`ViessmannClient: Error: ${JSON.stringify(err)}`, 'debug');
                    this.setConnected(false);
                });
        });
    }

    public async connect(credentials: Credentials): Promise<Client> {
        return this.oauth
            .connect(credentials)
            .then(() => {
                return this.initInstallation();
            }).then(() => this.fetchFeatures())
            .then(() => {
                log(`ViessmannClient: initialized with installation=${JSON.stringify(this.installation)}`, 'info');
                this.setConnected(true);
                return this;
            });
    }

    private setConnected(connected: boolean): void {
        this.connected = connected;
        this.connectionObservers.forEach(o => o(connected));
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public getInstallation(): ViessmannInstallation {
        return this.installation;
    }

    public getFeatures(): Feature[] {
        return Array.from(this.features.values());
    }

    public getFeature(name: string): Either<string, Feature> {
        const result = this.features.get(name);
        if (result) {
            return Either.right(result);
        }
        return Either.left(`Feature [${name}] not found`);
    }

    public async executeAction(featureName: string, actionName: string, payload?: any): Promise<Either<string, boolean>> {
        log(`ViessmannClient: executing action ${featureName}/${actionName}`, 'info');
        return this.getFeature(featureName)
            .flatMap(feature => feature.getAction(actionName))
            .flatMap(action => action.validated(payload))
            .flatMap(action => this.oauth.authenticated(action.method, action.href, payload)
                .then((response) => log(`ViessmannClient: action ${featureName}/${actionName} - received response ${JSON.stringify(response)}`, 'debug'))
                .then(() => this.fetchFeature(featureName))
                .then(fetchedFeature => fetchedFeature.ifPresent(f => this.updateObservers(f)))
                .then(() => Either.right<string, boolean>(true))
                .catch(err => {
                    log(`ViessmannClient: failed to execute action ${featureName}/${actionName} due to ${JSON.stringify(err)}`);
                    return Either.left<string, boolean>(`FeatureAction[${featureName}/${actionName}]: error executing action`);
                }), leftPromiseTransformer());

    }

    public observeConnection(observer: ConnectionObserver): void {
        this.connectionObservers.push(observer);
        this.scheduler.start();
    }

    public observe(observer: FeatureObserver): void {
        this.observers.push(observer);
        this.scheduler.start();
    }

    public clearObservers(): void {
        this.observers = [];
        this.connectionObservers = [];
        this.scheduler.stop();
    }

    private async fetchFeatures(): Promise<Map<string, Feature>> {
        return this.oauth
            .authenticatedGet(this.basePath())
            .then((response) => new Entity(response))
            .then((entity) => SirenFeature.createFeatures(entity, true))
            .then((features) => this.features = features);
    }

    private async fetchFeature(name: string): Promise<Optional<Feature>> {
        return this.oauth.authenticatedGet(this.basePath() + '/' + name)
            .then(body => SirenFeature.of(new Entity(body)));
    }

    private async updateObservers(feature: Feature): Promise<void> {
        feature.properties
            .forEach((p: Property) => this.observers
                .forEach((o: FeatureObserver) => o(feature, p)));
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
                const installationId: string = installation.properties._id;
                const modelDevice: Entity = installation.entities[0];
                const gatewayId: string = modelDevice.properties.serial;

                this.installation = {
                    installationId: installationId,
                    gatewayId: gatewayId,
                    deviceId: '0',
                };
            });
    }
}
