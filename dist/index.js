"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const oauth_client_1 = require("./viessmann/oauth-client");
const viessmann_api_client_1 = require("./viessmann/viessmann-api-client");
var either_1 = require("./lib/either");
exports.Either = either_1.Either;
exports.leftPromiseTransformer = either_1.leftPromiseTransformer;
var viessmann_api_client_2 = require("./viessmann/viessmann-api-client");
exports.Client = viessmann_api_client_2.Client;
var oauth_client_2 = require("./viessmann/oauth-client");
exports.AuthenticationFailed = oauth_client_2.AuthenticationFailed;
exports.RequestFailed = oauth_client_2.RequestFailed;
var viessmann_schema_1 = require("./viessmann/viessmann-schema");
exports.ComplexProperty = viessmann_schema_1.ComplexProperty;
exports.SimpleProperty = viessmann_schema_1.SimpleProperty;
exports.FeatureAction = viessmann_schema_1.FeatureAction;
function default_1(config) {
    return new viessmann_api_client_1.Client(config, new oauth_client_1.OAuthClient(config.auth));
}
exports.default = default_1;
//# sourceMappingURL=index.js.map