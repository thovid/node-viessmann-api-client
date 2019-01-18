[![Build Status](https://travis-ci.org/thovid/node-viessmann-api-client.svg?branch=master)](https://travis-ci.org/thovid/node-viessmann-api-client) [![codecov](https://codecov.io/gh/thovid/node-viessmann-api-client/branch/master/graph/badge.svg)](https://codecov.io/gh/thovid/node-viessmann-api-client)
[![npm version](https://badge.fury.io/js/viessmann-api-client.svg)](https://badge.fury.io/js/viessmann-api-client)

# node-viessmann-api-client

A nodejs client for the viessmann heating api.

Viessmann hosts an API to access features of a central heating that is connected to the internet via a *Vitoconnect* device. The API is used by the Viessmann App.
Inspired by https://github.com/thetrueavatar and his project https://github.com/thetrueavatar/Viessmann-Api, this is an early version of an API client written in typescript to be used in a nodejs app. 

Note that this is a private project, so use at your own risk! It is not supported or endorsed by Viessmann!

## Changelog
### 2.2.0 (2019/01/18)
- improved validation of `number` and `string` fields in action payloads: `number` fields validate `min`, `max` and `stepping` properties, `string` fields validate `enum` property
- added support for `Schedule` field in action payload 
### 2.1.0 (2018/12/17)
- execution of actions returns `Either<string, boolean>`, with `left` containing an error message in case of errors, and `right` containing `true` for a sucessful execution
### 2.0.0 (2018/12/15)
- added experimental implementation to execute actions
- changed some functions to return `Optional<T>` instead of `T | null`
### 1.0.2 (2018/12/10) 
- fixed a bug preventing features that contain sub-features to be recognized, for example `heating.burner`
### 1.0.1 (2018/12/08)
- initial version

## Usage
1. initialize configuration
```typescript
let config: ViessmannClientConfig = {
    auth: {
        host: 'https://iam.viessmann.com',
        token: '/idp/v1/token',
        authorize: '/idp/v1/authorize'
    },
    api: {
        host: 'https://api.viessmann-platform.io'
    }
};
```
2. connect the client and request some feature
```typescript
const credentials = {
    user: 'your username',
    password: 'your password'
};
const client = await new Client(config).connect(credentials);
const feature:Optional<Feature> = client.getFeature('heating.circuits.0.operating.programs.comfort');
// access properties of feature:
const propertyValue:Optional<number> = feature
    .flatMap(f => f.getProperty('temperature'))
    .flatMap(p => p.value)
    .toRight();
```

3. subscribe to updates
```typescript
let client: Client = ...;
const observer = (feature: Feature, property: Property) => { /* do something */ };
client.observe(observer);
```

4. monitor connection
```typescript
let client: Client = ...;
const connectionObserver = (connected: boolean) => { /* do something */ };
client.observeConnection(connectionObserver);
```
5. execute an action on a feature
```typescript
const result: Either<string, boolean> = await client.executeAction('heating.circuits.0.operating.programs.comfort', 'setTemperature', {targetTemperature: 22});
result.caseOf({
    left: error:string => /* log error */,
    right: ok:boolean => /* success */,
});
```
will execute the `setTemperature` action on the given feature using the given payload. The payload is validated against the field definition specified for this action.

## Authentication
The Viessmann API uses OAuth2 for authentication. 
### Authorization code: 
Provide username & password of your Viessmann account to authenticate by requesting a new authorization code. The client will automatically request a new access and refresh token. To store the refresh token, provide a callback in the configuration:
```typescript
const config: ViessmannClientConfig;
// ...
let notifiedToken: string;
config.auth.onRefresh = (rt: string) => { notifiedToken = rt; };
```
### Refresh token:
To authenticate using a refersh token, provide the refresh token as credentials:
```typescript
let refreshToken: string = ...;
let client = ...;

const credentials = {
    refreshToken: refreshToken
};

client.connect(credentials);
```
### Token refresh:
The client will refresh the token proactively if it is expired and also will try to refresh the token if requesting a resource returns `401`. If it receives a new token & refresh token, the callback `onRefresh` is called with the new refresh token.

### Logging
A custom log fuction can be provided by setting the `logger` property of the config object.

# Legal
- Viessmann and Vitroconnect are registered Trademarks of the Viessmann Werke GmbH & Co. KG. 

- This project is not offically supported or endorsed by the Viessmann Werke GmbH & Co. KG.

- In case you have any questions, please contact me via github!

# Licence
(c) 2018 by Thomas Vidic - see LICENCE for the licence under which this project is provided
