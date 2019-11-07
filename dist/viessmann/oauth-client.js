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
const request = require("request-promise-native");
const simpleOAuth = require("simple-oauth2");
const logger_1 = require("../lib/logger");
class AuthenticationFailed extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        Object.setPrototypeOf(this, AuthenticationFailed.prototype);
    }
}
exports.AuthenticationFailed = AuthenticationFailed;
class RequestFailed extends Error {
    constructor(status) {
        super(`Request failed with status ${status}`);
        this.status = status;
        Object.setPrototypeOf(this, RequestFailed.prototype);
    }
}
exports.RequestFailed = RequestFailed;
class OAuthClient {
    constructor(config) {
        this.config = config;
    }
    connect(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log('OAuthClient: initializing client', 'debug');
            return this
                .getInitialToken(credentials)
                .then((token) => {
                if (this.config.onRefresh) {
                    this.config.onRefresh(token.token.refresh_token);
                }
                this.token = token;
                return this;
            });
        });
    }
    authenticatedGet(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.authenticated('GET', uri, undefined);
        });
    }
    authenticated(method, uri, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.log(`OAuthClient: ${method} ${uri} - payload ${JSON.stringify(payload)}`, 'debug');
            return this.authenticatedWithRetry(method, uri, payload, false);
        });
    }
    authenticatedWithRetry(method, uri, payload, isRetry) {
        return __awaiter(this, void 0, void 0, function* () {
            return (isRetry ? this.refreshedToken() : this.getToken())
                .then(accessToken => {
                return {
                    method: method,
                    auth: {
                        bearer: accessToken,
                    },
                    headers: {
                        'x-api-key': API_KEY,
                    },
                    uri: uri,
                    resolveWithFullResponse: true,
                    simple: false,
                    json: payload,
                };
            }).then(options => request(options))
                .then((response) => {
                const status = response.statusCode;
                if (status === 401) {
                    if (isRetry) {
                        throw new AuthenticationFailed(`could not ${method} resource from/to [${uri}] - status was [${response.statusCode}]`);
                    }
                    else {
                        return this.authenticatedWithRetry(method, uri, payload, true);
                    }
                }
                else if (199 < status && status < 300) {
                    if (response.body) {
                        return JSON.parse(response.body);
                    }
                    else
                        return {};
                }
                else {
                    throw new RequestFailed(response.statusCode);
                }
            });
        });
    }
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.token.expired()) {
                logger_1.log('ViessmannOAtuhClient: refreshing token', 'debug');
                return this.refreshedToken();
            }
            return this.token.token.access_token;
        });
    }
    refreshedToken() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.token.refresh().then((refreshed) => {
                this.token = refreshed;
                if (this.config.onRefresh) {
                    this.config.onRefresh(this.token.token.refresh_token);
                }
                return this.token.token.access_token;
            }).catch((err) => {
                throw new AuthenticationFailed(`could not refresh access token due to ${err}`);
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
            logger_1.log('OAuthClient: requesting authorization code', 'debug');
            const options = {
                method: 'POST',
                uri: this.authUrl(),
                form: {},
                auth: {
                    user: user,
                    pass: password,
                },
                headers: {
                    'x-api-key': API_KEY,
                },
                resolveWithFullResponse: true,
                simple: false,
            };
            return request(options)
                .then((response) => this.extractAuthCode(response));
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
            const code = /code=(.*)/.exec(response.headers.location);
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
            logger_1.log(`OAuthClient: requesting initial access token using authCode=${authCode}`, 'debug');
            const tokenConfig = {
                code: authCode,
                redirect_uri: CALLBACK_URL,
                scope: SCOPE,
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
            logger_1.log(`OAuthClient: requesting initial access token using refreshToken=${refreshToken}`, 'debug');
            const credentials = this.createCredentials();
            const oauth2 = simpleOAuth.create(credentials);
            const initialToken = oauth2.accessToken.create({ refresh_token: refreshToken });
            return initialToken.refresh();
        });
    }
    createCredentials() {
        return {
            client: {
                id: CLIENT_ID,
                secret: SECRET,
            },
            auth: {
                tokenHost: this.config.host,
                tokenPath: this.config.token,
            },
        };
    }
}
exports.OAuthClient = OAuthClient;
const CLIENT_ID = '79742319e39245de5f91d15ff4cac2a8';
const SECRET = '8ad97aceb92c5892e102b093c7c083fa';
const API_KEY = 'token 38c97795ed8ae0ec139409d785840113bb0f5479893a72997932d447bd1178c8';
const SCOPE = 'offline_access';
const CALLBACK_URL = 'vicare://oauth-callback/everest';
//# sourceMappingURL=oauth-client.js.map