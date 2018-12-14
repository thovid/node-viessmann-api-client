import * as request from 'request-promise-native';
import * as simpleOAuth from 'simple-oauth2';
import {log} from './logger';

export interface ViessmannOAuthConfig {
    host: string;
    authorize: string;
    token: string;
    onRefresh?: OnRefresh;
}

export type Credentials = UserCredentials | TokenCredentials;

export interface UserCredentials {
    user: string;
    password: string;
}

export interface TokenCredentials {
    refreshToken: string;
}

export type OnRefresh = (string) => void;

export class AuthenticationFailed extends Error {
    constructor(public readonly message: string) {
        super(message);
        Object.setPrototypeOf(this, AuthenticationFailed.prototype);
    }
}

export class RequestFailed extends Error {
    constructor(public readonly status: number) {
        super(`Request failed with status ${status}`);
        Object.setPrototypeOf(this, RequestFailed.prototype);
    }
}

export class OAuthClient {
    private token: simpleOAuth.AccessToken;

    constructor(private config: ViessmannOAuthConfig) {}

    public async connect(credentials: Credentials): Promise<OAuthClient> {
        log('OAuthClient: initializing client', 'debug');
        return this
            .getInitialToken(credentials)
            .then((token) => {
                if (this.config.onRefresh) {
                    this.config.onRefresh(token.token.refresh_token);
                }
                this.token = token;
                return this;
            });
    }

    public async authenticatedGet(uri: string): Promise<any> {
        return this.authenticated('GET', uri, undefined);
    }

    public async authenticated(method: string, uri: string, payload: any): Promise<any> {
        log(`OAuthClient: ${method} ${uri}`, 'debug');
        return this.authenticatedWithRetry(method, uri, payload, false);
    }

    private async authenticatedWithRetry(method: string, uri: string, payload: any, isRetry: boolean): Promise<any> {
        return (isRetry ? this.refreshedToken() : this.getToken())
            .then(accessToken => {
                return {
                    method: method,
                    auth: {
                        bearer: accessToken,
                    },
                    uri: uri,
                    resolveWithFullResponse: true,
                    simple: false,
                    json: payload,
                };
            }).then(options => request(options))
            .then((response) => {
                switch (response.statusCode) {
                    case 401:
                        if (isRetry) {
                            throw new AuthenticationFailed(`could not ${method} resource from/to [${uri}] - status was [${response.statusCode}]`);
                        } else {
                            return this.authenticatedWithRetry(method, uri, payload, true);
                        }
                    case 200: // FIXME
                        if (response.body) {
                            return JSON.parse(response.body);
                        } else return {};
                    default:
                        throw new RequestFailed(response.statusCode);
                }
            });
    }

    private async getToken(): Promise<string> {
        if (this.token.expired()) {
            log('ViessmannOAtuhClient: refreshing token', 'debug');
            return this.refreshedToken();
        }
        return this.token.token.access_token;
    }

    private async refreshedToken(): Promise<string> {
        return this.token.refresh().then((refreshed) => {
            this.token = refreshed;
            if (this.config.onRefresh) {
                this.config.onRefresh(this.token.token.refresh_token);
            }
            return this.token.token.access_token;
        }).catch((err) => {
            throw new AuthenticationFailed(`could not refresh access token due to ${err}`);
        });
    }

    private async getInitialToken(credentials: UserCredentials | TokenCredentials): Promise<simpleOAuth.AccessToken> {
        if (this.isUserCredentials(credentials)) {
            return this.getAuthorzationCode(credentials.user, credentials.password)
                .then((code) => this.getTokenFromAuthCode(code));
        } else {
            return this.getTokenFromRefreshToken(credentials.refreshToken);
        }
    }

    private isUserCredentials(credentials: UserCredentials | TokenCredentials): credentials is UserCredentials {
        return (credentials as UserCredentials).user !== undefined;
    }

    private async getAuthorzationCode(user: string, password: string): Promise<string> {
        log('OAuthClient: requesting authorization code', 'debug');
        const options = {
            method: 'POST',
            uri: this.authUrl(),
            form: {
            },
            auth: {
                user: user,
                pass: password,
            },
            resolveWithFullResponse: true,
            simple: false,
        };

        return request(options)
            .then((response) => this.extractAuthCode(response));
    }

    private authUrl(): string {
        return this.config.host
            + this.config.authorize
            + '?client_id=' + CLIENT_ID
            + '&scope=' + SCOPE
            + '&redirect_uri=' + CALLBACK_URL
            + '&response_type=code';
    }

    private extractAuthCode(response: any): string {
        const statusCode = response && response.statusCode ? response.statusCode : -1;
        if (statusCode === 302) {
            const code = /code=(.*)/.exec(response.headers.location);
            if (code && code[1]) {
                return code[1];
            }
        }
        throw new AuthenticationFailed(`Could not retrieve authorization code - status code: [${statusCode}]`);
    }

    private async getTokenFromAuthCode(authCode: string): Promise<simpleOAuth.AccessToken> {
        const credentials = this.createCredentials();
        const oauth2 = simpleOAuth.create(credentials);
        log(`OAuthClient: requesting initial access token using authCode=${authCode}`, 'debug');
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
    }

    private async getTokenFromRefreshToken(refreshToken: string): Promise<simpleOAuth.AccessToken> {
        log(`OAuthClient: requesting initial access token using refreshToken=${refreshToken}`, 'debug');
        const credentials = this.createCredentials();
        const oauth2 = simpleOAuth.create(credentials);
        const initialToken = oauth2.accessToken.create({refresh_token: refreshToken});
        return initialToken.refresh();
    }

    private createCredentials() {
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

const CLIENT_ID = '79742319e39245de5f91d15ff4cac2a8';
const SECRET = '8ad97aceb92c5892e102b093c7c083fa';
const SCOPE = 'offline_access';
const CALLBACK_URL = 'vicare://oauth-callback/everest';
