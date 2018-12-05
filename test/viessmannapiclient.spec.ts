import { expect } from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as nock from 'nock';
import * as sinon from 'sinon';
import 'mocha';

import { ViessmannClientConfig, ViessmannInstallation, Client } from '../src/viessmann-api-client';
import { ViessmannOAuthConfig, AuthenticationFailed, Credentials } from '../src/oauth-client';

// Note: augmenting nock.Interceptor here until type def is fixed
declare module "nock" {
    interface Interceptor {
        matchHeader(name: string, value: string | RegExp | { (value: string): boolean; }): this;
    }
}

chai.use(chaiAsPromised);

const refreshToken = 'refresh_token';
const accessToken = 'access_token';

describe('viessmann api client', () => {

    let client: Client;

    afterEach('cleanup nock', () => {
        nock.cleanAll();
    });

    describe('initialized with user and password', () => {

        const auth: ViessmannOAuthConfig = {
            host: 'https://iam.mockedapi.com',
            authorize: '/idp/v1/authorize',
            token: '/idp/v1/token'
        };

        const config: ViessmannClientConfig = {
            auth: auth,
            api: {
                host: 'https://api.mockedapi.com'
            }
        };

        const credentials: Credentials = {
            user: 'some@user.com',
            password: 'secret'
        };

        it('should request auth code and access token', async () => {
            let authScope = setupOAuth(auth);
            setupData(config);

            client = new Client(config);
            await client.connect(credentials);
            authScope.done();
        });


        it('should report error if authorization code could not be retrieved', async () => {
            nock(auth.host)
                .post(auth.authorize, '')
                .query(() => { return true; })
                .reply(200, 'the response body') // api replies with login page if credentials don't match

            client = new Client(config);
            return expect(client.connect(credentials)).to.eventually.be.rejectedWith(AuthenticationFailed);
        });
    });

    describe('initialized with refresh token', async () => {

        const auth: ViessmannOAuthConfig = {
            host: 'https://iam.mockedapi.com',
            authorize: '/idp/v1/authorize',
            token: '/idp/v1/token'
        };

        const config: ViessmannClientConfig = {
            auth: auth,
            api: {
                host: 'https://api.mockedapi.com'
            }
        };

        const credentials = {
            refreshToken: refreshToken
        };

        it('should request a new access token', async () => {
            nock(auth.host)
                .post(auth.token, new RegExp('grant_type=refresh_token&refresh_token=' + refreshToken))
                .reply(200, {
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    token_type: 'Bearer',
                    expires_in: 3600
                });
            setupData(config);
            client = new Client(config);
            await client.connect(credentials);
        });
    });

    describe('that is initialized', async () => {
        const config: ViessmannClientConfig = {
            auth: {
                host: 'https://iam.mockedapi.com',
                authorize: '/idp/v1/authorize',
                token: '/idp/v1/token'
            },
            api: {
                host: 'https://api.mockedapi.com'
            }
        };

        const credentials = {
            user: 'some@user.com',
            password: 'secret'
        };

        it('should notify about initial refresh token', async () => {
            let notifiedToken: string;
            config.auth.onRefresh = (rt: string) => { notifiedToken = rt; };

            setupOAuth(config.auth);
            setupData(config);

            client = new Client(config);
            await client.connect(credentials);

            expect(notifiedToken).to.be.equal(refreshToken);
        });

        it('should request installations', async () => {
            setupOAuth(config.auth);
            let dataScope = setupData(config);

            const expectedInstallation: ViessmannInstallation = {
                installationId: '99999',
                gatewayId: '123456',
                deviceId: '0'
            };
            client = new Client(config);
            await client.connect(credentials);

            expect(client.getInstallation()).to.be.deep.equal(expectedInstallation);
            dataScope.done();
        });

        it('should refresh access token proactively if it is expired', async () => {
            const newAccessToken = 'new_access_token';
            const newRefreshToken = 'new_refresh_token';

            let notifiedToken: string;
            config.auth.onRefresh = (rt) => { notifiedToken = rt; };

            let authScope = setupOAuth(config.auth, -1); // negative expire_in to force refresh

            authScope.post(config.auth.token, new RegExp('grant_type=refresh_token&refresh_token=' + refreshToken))
                .reply(200, {
                    access_token: newAccessToken,
                    refresh_token: newRefreshToken,
                    token_type: 'Bearer',
                    expires_in: 3600
                });

            let dataScope = setupData(config, newAccessToken);
            client = new Client(config);
            await client.connect(credentials);

            expect(notifiedToken).to.be.equal(newRefreshToken);
            authScope.done();
            dataScope.done();
        });

        it('should retry with refreshed access token if access token is rejected', async () => {
            const newAccessToken = 'new_access_token';
            setupOAuth(config.auth)
                .post(config.auth.token, new RegExp('grant_type=refresh_token&refresh_token=' + refreshToken))
                .reply(200, {
                    access_token: newAccessToken,
                    refresh_token: refreshToken,
                    token_type: 'Bearer',
                    expires_in: 3600
                });
            nock(config.api.host)
                .get('/general-management/installations')
                .matchHeader('authorization', 'Bearer ' + accessToken)
                .reply(401, 'some error in body')
                .get('/general-management/installations')
                .matchHeader('authorization', 'Bearer ' + newAccessToken)
                .reply(200, responseBody('installations'))
                .get(featuresPath())
                .reply(200, responseBody('features'));


            client = new Client(config);
            await client.connect(credentials);
        });

        it('should report error of access token could not be retrieved', () => {
            setupAuthCode(config.auth, 'irrelevant')
                .post(config.auth.token, new RegExp('.*'))
                .reply(400, { "error": "invalid-token-request" });

            client = new Client(config);
            return expect(client.connect(credentials)).to.eventually.be.rejectedWith(AuthenticationFailed);
        });

        it('should report error if access token could not be refreshed', () => {
            // negative expiresIn to force refresh
            setupOAuth(config.auth, -1)
                .post(config.auth.token, new RegExp('grant_type=refresh_token&refresh_token=' + refreshToken))
                .reply(400, { "error": "invalid-token-request" });

            client = new Client(config);
            return expect(client.connect(credentials)).to.eventually.be.rejectedWith(AuthenticationFailed);
        });

    });

    describe('requesting data', async () => {
        const config: ViessmannClientConfig = {
            auth: {
                host: 'https://iam.mockedapi.com',
                authorize: '/idp/v1/authorize',
                token: '/idp/v1/token'
            },
            api: {
                host: 'https://api.mockedapi.com'
            }
        };
        const credentials = {
            user: 'some@user.com',
            password: 'secret'
        };

        let clock;
        beforeEach('mock clock', () => {
            clock = sinon.useFakeTimers();
        });

        afterEach('reset mocked clock', () => {
            clock.restore();
        });


        it('should fetch the current external temperature upon request', async () => {
            setupOAuth(config.auth);
            setupData(config);

            client = new Client(config);
            await client.connect(credentials);
            const feature = client.getFeature('heating.sensors.temperature.outside');
            const temperature = feature.getProperty('value').value;
            return expect(temperature).to.be.equal(7.8);
        });

        it('should fetch the current boiler temperature upon request', async () => {
            setupOAuth(config.auth);
            setupData(config)
                .get(dataPath('heating.boiler.sensors.temperature.main'))
                .reply(200, responseBody('heating.boiler.sensors.temperature.main'));

            client = new Client(config);
            await client.connect(credentials);
            const temperature = client.getValue('heating.boiler.sensors.temperature.main');
            return expect(temperature).to.eventually.be.equal(36);
        });

        it('should observe external temperature if requested', async () => {
            setupOAuth(config.auth);
            setupData(config)
                .get(dataPath('heating.sensors.temperature.outside'))
                .reply(200, responseBody('heating.sensors.temperature.outside'));

            // wrap into promise to assert eventually below
            let observed: Promise<number> = new Promise(async (resolve, reject) => {
                client = new Client(config);
                await client.connect(credentials);
                client.observe('heating.sensors.temperature.outside', (value) => {
                    resolve(value);
                    client.clearObservers();
                });

                clock.tick(60000);
            });

            return expect(observed).to.eventually.be.equal(7.6);
        });
    });
});

function setupOAuth(oauthConfig: ViessmannOAuthConfig, expiresIn?: number) {
    const authCode = '12345';
    return setupAuthCode(oauthConfig, authCode)
        .post(oauthConfig.token, new RegExp('code=' + authCode))
        .reply(200, {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: expiresIn ? expiresIn : 3600
        });
};

function setupAuthCode(oauthConfig: ViessmannOAuthConfig, authCode: string) {
    return nock(oauthConfig.host)
        .post(oauthConfig.authorize, '')
        .query(() => { return true; })
        .reply(302, 'the response body', {
            'location': 'some/url?code=' + authCode
        });
};

function setupData(config: ViessmannClientConfig, token?: string) {
    return nock(config.api.host)
        .matchHeader('authorization', 'Bearer ' + (token ? token : accessToken))
        .get('/general-management/installations')
        .reply(200, responseBody('installations'))
        .get(featuresPath())
        .reply(200, responseBody('features'));
}

function dataPath(feature: string): string {
    return featuresPath() + '/' + feature;
}

function featuresPath(): string {
    return '/operational-data/installations/99999/gateways/123456/devices/0/features';
}

function responseBody(name: string): string {
    return JSON.stringify(require('./data/testresponse.' + name + '.json'));

}