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
const scheduler_1 = require("./scheduler");
const siren_1 = require("./parser/siren");
const oauth_client_1 = require("./oauth-client");
var ViessmannFeature;
(function (ViessmannFeature) {
    ViessmannFeature["EXTERNAL_TEMPERATURE"] = "heating.sensors.temperature.outside";
    ViessmannFeature["BOILER_TEMPERATURE"] = "heating.boiler.sensors.temperature.main";
})(ViessmannFeature = exports.ViessmannFeature || (exports.ViessmannFeature = {}));
class ViessmannClient {
    constructor(oauth, config, installation) {
        this.oauth = oauth;
        this.config = config;
        this.installation = installation;
        this.observers = new Map();
        logger_1.log(`ViessmannClient: initialized with installation=${JSON.stringify(installation)}`, 'info');
        this.scheduler = new scheduler_1.Scheduler(60, () => {
            this.observers.forEach((obs, feature) => {
                this.getValue(feature)
                    .then(res => obs(res))
                    .catch((err) => logger_1.log(`ViessmannClient: Error [${err}] during update of observer for [${feature}]`, 'error'));
            });
        });
    }
    clearObservers() {
        this.observers.clear();
        this.scheduler.stop();
    }
    getInstallation() {
        return this.installation;
    }
    getValue(feature) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log(`ViessmannClient: getting property ${feature}`, 'debug');
            const basePath = this.basePath();
            return this.oauth
                .authenticatedGet(basePath + feature)
                .then((response) => new siren_1.Entity(response))
                .then((entity) => entity.properties['value']['value']);
        });
    }
    observe(feature, observer) {
        this.observers.set(feature, observer);
        this.scheduler.start();
    }
    basePath() {
        return this.config.api.host
            + '/operational-data/installations/' + this.installation.installationId
            + '/gateways/' + this.installation.gatewayId
            + '/devices/' + this.installation.deviceId
            + '/features/';
    }
}
exports.ViessmannClient = ViessmannClient;
function initializeClient(config) {
    return __awaiter(this, void 0, void 0, function* () {
        return oauth_client_1.createOAuthClient(config.auth)
            .then((authClient) => initInstallation(authClient, config));
    });
}
exports.initializeClient = initializeClient;
function initInstallation(authClient, config) {
    return __awaiter(this, void 0, void 0, function* () {
        logger_1.log('ViessmannClient: requesting installation details during initialization', 'debug');
        return authClient.authenticatedGet(config.api.host + '/general-management/installations')
            .then((body) => new siren_1.Entity(body))
            .then((entity) => {
            const installation = entity.entities[0];
            const installationId = installation.properties['_id'];
            const modelDevice = installation.entities[0];
            const gatewayId = modelDevice.properties['serial'];
            const result = {
                installationId: installationId,
                gatewayId: gatewayId,
                deviceId: '0'
            };
            return new ViessmannClient(authClient, config, result);
        });
    });
}
;
//# sourceMappingURL=viessmann-api-client.js.map