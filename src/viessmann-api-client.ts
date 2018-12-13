import {log, LoggerFunction, setCustomLogger} from './logger';
import {Credentials, OAuthClient, ViessmannOAuthConfig} from './oauth-client';
import {Entity} from './parser/siren';
import {Feature, Property, SirenFeature} from './parser/viessmann-schema';
import {Scheduler} from './scheduler';

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
    private features: Map<string, Feature>;

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
                    .forEach((f: Feature) => f.properties
                        .forEach((p: Property) => this.observers
                            .forEach((o: FeatureObserver) => o(f, p)))))
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
        if (this.features === undefined) {
            return [];
        }
        return Array.from(this.features.values());
    }

    public getFeature(name: string): Feature | null {
        return this.features.get(name);
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
