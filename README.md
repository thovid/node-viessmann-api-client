[![Build Status](https://travis-ci.org/thovid/node-viessmann-api-client.svg?branch=master)](https://travis-ci.org/thovid/node-viessmann-api-client)

# node-viessmann-api-client

A nodejs client for the viessmann heating api

Viessmann hosts an API to access features of a central heating that is connected to the internet via a *Vitoconnect* device. The API is used by the Viessmann App.
Inspired by https://github.com/thetrueavatar and his project https://github.com/thetrueavatar/Viessmann-Api, this is an early version of an API client written in typescript to be used in a nodejs app. 

## Usage
1. initialize configuration
```typescript
let config: ViessmannClientConfig = {
    auth: {
        credentials: {
            user: 'your username',
            password: 'your password'
        },
        host: 'https://iam.viessmann.com',
        token: '/idp/v1/token',
        authorize: '/idp/v1/authorize'
    },
    api: {
        host: 'https://api.viessmann-platform.io'
    }
};
```
2. initialize the client and request some feature
```typescript
initializeClient(config).then((client) => client.getExternalTemperature())
    .then((temp) => console.log(`external temperature = ${temp}`))
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
To authenticate using a refersh token, provide the refresh token during initialization:
```typescript
let refreshToken: string = ...;

const auth: ViessmannOAuthConfig = {
            credentials: {
                refreshToken: refreshToken
            },
            host: 'https://iam.mockedapi.com',
            authorize: '/idp/v1/authorize',
            token: '/idp/v1/token'
        };
const config: ViessmannClientConfig = {
 auth: auth,
    api: {
        host: 'https://api.viessmann-platform.io'
    }
```
### Token refresh:
The client will refresh the token proactively if it is expired and also will try to refresh the token if requesting a resource returns `401`. If it receives a new token & refresh token, the callback `onRefresh` is called with the new refresh token.

### Logging
A custom log fuction can be provided by importing `customLogger` from `logger` to set a log function.

# Licence
(c) 2018 by Thomas Vidic - see LICENCE for the licence under which this project is provided
