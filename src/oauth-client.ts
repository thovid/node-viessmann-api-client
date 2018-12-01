import * as request from "request-promise-native";
import * as simpleOAuth from "simple-oauth2";
import { url } from "inspector";

export interface ViessmannOAuthConfig {
    credentials: UserCredentials | TokenCredentials;
    host: string;
    authorize: string;
    token: string;
    onRefresh?: OnRefresh;
}

export interface UserCredentials {
    user: string;
    password: string;
}

export interface TokenCredentials {
    refreshToken: string;
}

export type OnRefresh = (string) => void

export class AuthenticationFailed extends Error {
    constructor(public readonly message: string) {
        super(message);
        Object.setPrototypeOf(this, AuthenticationFailed.prototype);
    }
}

export class ViessmannOAuthClient {

    constructor(private readonly config: ViessmannOAuthConfig,
        private token: simpleOAuth.AccessToken) {
    }

    public async authenticatedGet(uri: string): Promise<any> {
        return this.authenticatedGetWithRetry(uri, false);
    }

    private async authenticatedGetWithRetry(uri: string, isRetry: boolean): Promise<any> {
        //console.log('[oauth-client] GET ' + uri);
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
                    } else {
                        return this.authenticatedGetWithRetry(uri, true);
                    }
                }
                return JSON.parse(response.body);
            });
    }

    private async getToken(): Promise<string> {
        if (this.token.expired()) {
            return this.refreshedToken();
        }
        return this.token.token['access_token'];
    }

    private async refreshedToken(): Promise<string> {
        return this.token.refresh().then((refreshed) => {
            this.token = refreshed;
            if (this.config.onRefresh) {
                this.config.onRefresh(this.token.token['refresh_token']);
            }
            return this.token.token['access_token'];
        }).catch((err) => {
            throw new AuthenticationFailed(`could not refresh access token due to ${err}`)
        });
    }
}

export async function createOAuthClient(config: ViessmannOAuthConfig): Promise<ViessmannOAuthClient> {
    return new Initializer(config).initialize(config.credentials);
}

class Initializer {
    constructor(private readonly config: ViessmannOAuthConfig) { };

    public async initialize(credentials: UserCredentials | TokenCredentials): Promise<ViessmannOAuthClient> {
        return this
            .getInitialToken(credentials)
            .then((token) => {
                if (this.config.onRefresh) {
                    this.config.onRefresh(token.token['refresh_token']);
                }
                return new ViessmannOAuthClient(this.config, token);
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
        return (<UserCredentials>credentials).user !== undefined;
    }

    private async getAuthorzationCode(user: string, password: string): Promise<string> {
        const options = {
            method: 'POST',
            uri: this.authUrl(),
            form: {
            },
            auth: {
                user: user,
                pass: password
            },
            resolveWithFullResponse: true,
            simple: false
        };

        return request(options)
            .then((response) => { return this.extractAuthCode(response); });
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
            let code = /code=(.*)/.exec(response.headers['location']);
            if (code && code[1]) {
                return code[1];
            }
        }
        throw new AuthenticationFailed(`Could not retrieve authorization code - status code: [${statusCode}]`);
    }

    private async getTokenFromAuthCode(authCode: string): Promise<simpleOAuth.AccessToken> {
        const credentials = this.createCredentials();
        const oauth2 = simpleOAuth.create(credentials);

        const tokenConfig = {
            code: authCode,
            redirect_uri: CALLBACK_URL,
            scope: SCOPE
        };


        return oauth2.authorizationCode.getToken(tokenConfig)
            .then((response) => {
                return oauth2.accessToken.create(response);
            }).catch((err) => {
                throw new AuthenticationFailed(`could not retrieve access token due to ${err}`)
            });
    }

    private async getTokenFromRefreshToken(refreshToken: string): Promise<simpleOAuth.AccessToken> {
        const credentials = this.createCredentials();
        const oauth2 = simpleOAuth.create(credentials);
        const initialToken = oauth2.accessToken.create({ 'refresh_token': refreshToken });
        return initialToken.refresh();
    }

    private createCredentials() {
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