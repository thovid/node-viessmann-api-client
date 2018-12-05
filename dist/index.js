"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const viessmann_api_client_1 = require("./viessmann-api-client");
var viessmann_api_client_2 = require("./viessmann-api-client");
exports.Client = viessmann_api_client_2.Client;
var oauth_client_1 = require("./oauth-client");
exports.AuthenticationFailed = oauth_client_1.AuthenticationFailed;
var viessmann_schema_1 = require("./parser/viessmann-schema");
exports.ComplexProperty = viessmann_schema_1.ComplexProperty;
exports.SimpleProperty = viessmann_schema_1.SimpleProperty;
function default_1(config) {
    return new viessmann_api_client_1.Client(config);
}
exports.default = default_1;
;
//# sourceMappingURL=index.js.map