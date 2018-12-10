[![Build Status](https://travis-ci.org/thovid/node-viessmann-api-client.svg?branch=master)](https://travis-ci.org/thovid/node-viessmann-api-client) [![codecov](https://codecov.io/gh/thovid/node-viessmann-api-client/branch/master/graph/badge.svg)](https://codecov.io/gh/thovid/node-viessmann-api-client)

# node-viessmann-api-client

A nodejs client for the viessmann heating api

Viessmann hosts an API to access features of a central heating that is connected to the internet via a *Vitoconnect* device. The API is used by the Viessmann App.
Inspired by https://github.com/thetrueavatar and his project https://github.com/thetrueavatar/Viessmann-Api, this is an early version of an API client written in typescript to be used in a nodejs app. 

## Changelog
### 1.0.2: bugfixes
- fixed a bug preventing features that contain sub-features to be recognized, for example `heating.burner`
### 1.0.1: inital publish
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
const feature = client.getFeature('some.feature.name');
// access properties of feature:
const propertyValue = feature.getProperty('property-name').value;
```

3. subscribe to updates
```typescript
let client: Client = ...;
const observer = (feature: Feature, property: Property) => { /* do something */};
client.observe(observer);
```

4. monitor connection
```typescript
let client: Client = ...;
const connectionObserver = (connected: boolean) => { /* do something */};
client.observeConnection(connectionObserver);
```

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

# Licence
(c) 2018 by Thomas Vidic - see LICENCE for the licence under which this project is provided
