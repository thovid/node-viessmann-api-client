import * as simpleOAuth from "simple-oauth2";
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
export declare type OnRefresh = (string: any) => void;
export declare class AuthenticationFailed extends Error {
    readonly message: string;
    constructor(message: string);
}
export declare class ViessmannOAuthClient {
    private readonly config;
    private token;
    constructor(config: ViessmannOAuthConfig, token: simpleOAuth.AccessToken);
    authenticatedGet(uri: string): Promise<any>;
    private authenticatedGetWithRetry;
    private getToken;
    private refreshedToken;
}
export declare function createOAuthClient(config: ViessmannOAuthConfig): Promise<ViessmannOAuthClient>;
