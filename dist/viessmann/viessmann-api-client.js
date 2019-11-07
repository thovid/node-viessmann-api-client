"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const either_1 = require("../lib/either");
const logger_1 = require("../lib/logger");
const scheduler_1 = require("../lib/scheduler");
const siren_1 = require("../parser/siren");
const oauth_client_1 = require("./oauth-client");
const viessmann_schema_1 = require("./viessmann-schema");
class Client {
    constructor(config, oauth) {
        this.config = config;
        this.features = new Map();
        this.observers = [];
        this.connectionObservers = [];
        this.connected = false;
        logger_1.setCustomLogger(config.logger);
        this.oauth = oauth !== undefined ? oauth : new oauth_client_1.OAuthClient(config.auth);
        const pollInterval = config.pollInterval !== undefined ? config.pollInterval : 60000;
        logger_1.log(`ViessmannClient: initializing with pollIntervall ${pollInterval}`);
        this.scheduler = new scheduler_1.Scheduler(pollInterval, () => __awaiter(this, void 0, void 0, function* () {
            logger_1.log('ViessmannClient: polling for updates...', 'debug');
            this.fetchFeatures()
                .then(features => Array.from(features.values()))
                .then(features => features
                .forEach(f => this.updateObservers(f)))
                .then(() => {
                this.setConnected(true);
            })
                .catch(err => {
                const message = err.message || 'unknown error';
                logger_1.log(`ViessmannClient: error fetching features: ${message}`);
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
                this.setConnected(true);
                return this;
            });
        });
    }
    setConnected(connected) {
        this.connected = connected;
        this.connectionObservers.forEach(o => o(connected));
    }
    isConnected() {
        return this.connected;
    }
    getInstallation() {
        return this.installation;
    }
    getFeatures() {
        return Array.from(this.features.values());
    }
    getFeature(name) {
        const result = this.features.get(name);
        if (result) {
            return either_1.Either.right(result);
        }
        return either_1.Either.left(`Feature [${name}] not found`);
    }
    executeAction(featureName, actionName, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log(`ViessmannClient: executing action ${featureName}/${actionName}`, 'info');
            return this.getFeature(featureName)
                .flatMap(feature => feature.getAction(actionName))
                .flatMap(action => action.validated(payload))
                .flatMap(action => this.oauth.authenticated(action.method, action.href, payload)
                .then((response) => logger_1.log(`ViessmannClient: action ${featureName}/${actionName} - received response ${JSON.stringify(response)}`, 'debug'))
                .then(() => this.fetchFeature(featureName))
                .then(fetchedFeature => fetchedFeature.ifPresent(f => this.updateObservers(f)))
                .then(() => either_1.Either.right(true))
                .catch(err => {
                logger_1.log(`ViessmannClient: failed to execute action ${featureName}/${actionName} due to ${JSON.stringify(err)}`);
                return either_1.Either.left(`FeatureAction[${featureName}/${actionName}]: error executing action`);
            }), either_1.leftPromiseTransformer());
        });
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
        this.connectionObservers = [];
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
    fetchFeature(name) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.oauth.authenticatedGet(this.basePath() + '/' + name)
                .then(body => viessmann_schema_1.SirenFeature.of(new siren_1.Entity(body)));
        });
    }
    updateObservers(feature) {
        return __awaiter(this, void 0, void 0, function* () {
            feature.properties
                .forEach((p) => this.observers
                .forEach((o) => o(feature, p)));
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