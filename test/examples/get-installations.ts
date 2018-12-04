import { initializeClient, ViessmannFeature } from '../../src/viessmann-api-client';

let config = {
    auth: {
        // FIXME read credentials from private file!
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

initializeClient(config).then((client) => client.getValue(ViessmannFeature.EXTERNAL_TEMPERATURE))
    .then((temp) => console.log(`external temperature = ${temp}`))
    .catch((err) => console.log("An error occurred: " + JSON.stringify(err)));