"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./logger");
const oauth_client_1 = require("./oauth-client");
const siren_1 = require("./parser/siren");
const viessmann_schema_1 = require("./parser/viessmann-schema");
const scheduler_1 = require("./scheduler");
class Client {
    constructor(config, oauth) {
        this.config = config;
        this.observers = [];
        this.connectionObservers = [];
        this.connected = false;
        logger_1.setCustomLogger(config.logger);
        this.oauth = oauth !== undefined ? oauth : new oauth_client_1.OAuthClient(config.auth);
        const pollInterval = config.pollInterval !== undefined ? config.pollInterval : 60000;
        logger_1.log(`ViessmannClient: initializing with pollIntervall ${pollInterval}`);
        this.scheduler = new scheduler_1.Scheduler(pollInterval, () => __awaiter(this, void 0, void 0, function* () {
            logger_1.log('ViessmannClient: polling for updates...');
            this.fetchFeatures()
                .then(features => Array.from(features.values()))
                .then(features => features
                .forEach((f) => f.properties
                .forEach((p) => this.observers
                .forEach((o) => o(f, p)))))
                .then(() => {
                this.setConnected(true);
            })
                .catch(err => {
                logger_1.log('ViessmannClient: error fetching features');
                logger_1.log(`ViessmannClient: Error: ${JSON.stringify(err)}`, 'debug');
                this.setConnected(false);
            });
        }));
    }
    connect(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.oauth
                .connect(credentials)
                .then(() => {
                return this.initInstallation();
            }).then(() => this.fetchFeatures())
                .then(() => {
                logger_1.log(`ViessmannClient: initialized with installation=${JSON.stringify(this.installation)}`, 'info');
                this.connected = true;
                return this;
            });
        });
    }
    setConnected(connected) {
        this.connected = connected;
        this.connectionObservers.forEach(o => o(this.connected));
    }
    isConnected() {
        return this.connected;
    }
    getInstallation() {
        return this.installation;
    }
    getFeatures() {
        if (this.features === undefined) {
            return [];
        }
        return Array.from(this.features.values());
    }
    getFeature(name) {
        return this.features.get(name);
    }
    observeConnection(observer) {
        this.connectionObservers.push(observer);
        this.scheduler.start();
    }
    observe(observer) {
        this.observers.push(observer);
        this.scheduler.start();
    }
    clearObservers() {
        this.observers = [];
        this.scheduler.stop();
    }
    fetchFeatures() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.oauth
                .authenticatedGet(this.basePath())
                .then((response) => new siren_1.Entity(response))
                .then((entity) => viessmann_schema_1.SirenFeature.createFeatures(entity, true))
                .then((features) => this.features = features);
        });
    }
    basePath() {
        return this.config.api.host
            + '/operational-data/installations/' + this.installation.installationId
            + '/gateways/' + this.installation.gatewayId
            + '/devices/' + this.installation.deviceId
            + '/features';
    }
    initInstallation() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log('ViessmannClient: requesting installation details during initialization', 'debug');
            return this.oauth.authenticatedGet(this.config.api.host + '/general-management/installations')
                .then((body) => new siren_1.Entity(body))
                .then((entity) => {
                const installation = entity.entities[0];
                const installationId = installation.properties._id;
                const modelDevice = installation.entities[0];
                const gatewayId = modelDevice.properties.serial;
                this.installation = {
                    installationId: installationId,
                    gatewayId: gatewayId,
                    deviceId: '0',
                };
            });
        });
    }
}
exports.Client = Client;
//# sourceMappingURL=viessmann-api-client.js.map