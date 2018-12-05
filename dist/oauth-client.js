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
const request = require("request-promise-native");
const simpleOAuth = require("simple-oauth2");
const logger_1 = require("./logger");
class AuthenticationFailed extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        Object.setPrototypeOf(this, AuthenticationFailed.prototype);
    }
}
exports.AuthenticationFailed = AuthenticationFailed;
class ViessmannOAuthClient {
    constructor(config, token) {
        this.config = config;
        this.token = token;
    }
    authenticatedGet(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log(`ViessmannOAuthClient: GET ${uri}`, 'debug');
            return this.authenticatedGetWithRetry(uri, false);
        });
    }
    authenticatedGetWithRetry(uri, isRetry) {
        return __awaiter(this, void 0, void 0, function* () {
            return (isRetry ? this.refreshedToken() : this.getToken())
                .then(accessToken => {
                return {
                    method: 'GET',
                    auth: {
                        bearer: accessToken
                    },
                    uri: uri,
                    resolveWithFullResponse: true,
                    simple: false
                };
            }).then(options => request(options))
                .then((response) => {
                if (response.statusCode === 401) {
                    if (isRetry) {
                        throw new AuthenticationFailed(`could not GET resource from [${uri}] - status was [${response.statusCode}]`);
                    }
                    else {
                        return this.authenticatedGetWithRetry(uri, true);
                    }
                }
                return JSON.parse(response.body);
            });
        });
    }
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.token.expired()) {
                logger_1.log('ViessmannOAtuhClient: refreshing token', 'debug');
                return this.refreshedToken();
            }
            return this.token.token['access_token'];
        });
    }
    refreshedToken() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.token.refresh().then((refreshed) => {
                this.token = refreshed;
                if (this.config.onRefresh) {
                    this.config.onRefresh(this.token.token['refresh_token']);
                }
                return this.token.token['access_token'];
            }).catch((err) => {
                throw new AuthenticationFailed(`could not refresh access token due to ${err}`);
            });
        });
    }
}
exports.ViessmannOAuthClient = ViessmannOAuthClient;
function createOAuthClient(config, credentials) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Initializer(config).initialize(credentials);
    });
}
exports.createOAuthClient = createOAuthClient;
class Initializer {
    constructor(config) {
        this.config = config;
    }
    ;
    initialize(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log('ViessmannOAuthClient: initializing client', 'debug');
            return this
                .getInitialToken(credentials)
                .then((token) => {
                if (this.config.onRefresh) {
                    this.config.onRefresh(token.token['refresh_token']);
                }
                return new ViessmannOAuthClient(this.config, token);
            });
        });
    }
    getInitialToken(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isUserCredentials(credentials)) {
                return this.getAuthorzationCode(credentials.user, credentials.password)
                    .then((code) => this.getTokenFromAuthCode(code));
            }
            else {
                return this.getTokenFromRefreshToken(credentials.refreshToken);
            }
        });
    }
    isUserCredentials(credentials) {
        return credentials.user !== undefined;
    }
    getAuthorzationCode(user, password) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log('ViessmannOAuthClient: requesting authorization code', 'debug');
            const options = {
                method: 'POST',
                uri: this.authUrl(),
                form: {},
                auth: {
                    user: user,
                    pass: password
                },
                resolveWithFullResponse: true,
                simple: false
            };
            return request(options)
                .then((response) => { return this.extractAuthCode(response); });
        });
    }
    authUrl() {
        return this.config.host
            + this.config.authorize
            + '?client_id=' + CLIENT_ID
            + '&scope=' + SCOPE
            + '&redirect_uri=' + CALLBACK_URL
            + '&response_type=code';
    }
    extractAuthCode(response) {
        const statusCode = response && response.statusCode ? response.statusCode : -1;
        if (statusCode === 302) {
            let code = /code=(.*)/.exec(response.headers['location']);
            if (code && code[1]) {
                return code[1];
            }
        }
        throw new AuthenticationFailed(`Could not retrieve authorization code - status code: [${statusCode}]`);
    }
    getTokenFromAuthCode(authCode) {
        return __awaiter(this, void 0, void 0, function* () {
            const credentials = this.createCredentials();
            const oauth2 = simpleOAuth.create(credentials);
            logger_1.log(`ViessmannOAuthClient: requesting initial access token using authCode=${authCode}`, 'debug');
            const tokenConfig = {
                code: authCode,
                redirect_uri: CALLBACK_URL,
                scope: SCOPE
            };
            return oauth2.authorizationCode.getToken(tokenConfig)
                .then((response) => {
                return oauth2.accessToken.create(response);
            }).catch((err) => {
                throw new AuthenticationFailed(`could not retrieve access token due to ${err}`);
            });
        });
    }
    getTokenFromRefreshToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log(`ViessmannOAuthClient: requesting initial access token using refreshToken=${refreshToken}`, 'debug');
            const credentials = this.createCredentials();
            const oauth2 = simpleOAuth.create(credentials);
            const initialToken = oauth2.accessToken.create({ 'refresh_token': refreshToken });
            return initialToken.refresh();
        });
    }
    createCredentials() {
        return {
            client: {
                id: CLIENT_ID,
                secret: SECRET
            },
            auth: {
                tokenHost: this.config.host,
                tokenPath: this.config.token
            }
        };
    }
}
const CLIENT_ID = '79742319e39245de5f91d15ff4cac2a8';
const SECRET = '8ad97aceb92c5892e102b093c7c083fa';
const SCOPE = 'offline_access';
const CALLBACK_URL = 'vicare://oauth-callback/everest';
//# sourceMappingURL=oauth-client.js.map