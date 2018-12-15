import { OAuthClient } from './oauth-client';
import { Client, ViessmannClientConfig } from './viessmann-api-client';

export {
    Client,
    ViessmannClientConfig,
    ViessmannAPIURLs,
    ViessmannInstallation,
    FeatureObserver,
    ConnectionObserver,
} from './viessmann-api-client';

export {
    ViessmannOAuthConfig,
    UserCredentials,
    TokenCredentials,
    Credentials,
    OnRefresh,
    AuthenticationFailed,
    RequestFailed,
} from './oauth-client';

export {
    Feature,
    MetaInformation,
    Property,
    ComplexProperty,
    SimpleProperty,
    FeatureAction,
} from './parser/viessmann-schema';

export {
    LoggerFunction,
} from './logger';

export default function(config: ViessmannClientConfig): Client {
    return new Client(config, new OAuthClient(config.auth));
}
