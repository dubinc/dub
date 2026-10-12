import { document } from ".";
import { OAUTH_SCOPE_DESCRIPTIONS, OAUTH_SCOPES } from "../api/oauth/constants";

// OpenAPI document served at `api.dub.co/?mcp` for MCP clients.
// Copies the public spec, adds an OAuth 2.0 (authorization code) security scheme
// with the scopes from OAUTH_SCOPES, and accepts either the API key (`token`) or
// OAuth at the document level. Operation-level security is left unchanged.
//
// Example (truncated):
// {
//   "openapi": "3.0.3",
//   "paths": { ... },
//   "components": {
//     "securitySchemes": {
//       "token": { "type": "http", "scheme": "bearer", ... },
//       "oauth": {
//         "type": "oauth2",
//         "flows": {
//           "authorizationCode": {
//             "authorizationUrl": "https://app.dub.co/oauth/authorize",
//             "tokenUrl": "https://api.dub.co/oauth/token",
//             "scopes": { "links.read": "Read access to links", ... }
//           }
//         }
//       }
//     }
//   },
//   "security": [{ "token": [] }, { "oauth": [] }]
// }
export function getMcpDocument(): typeof document {
  const mcpDocument = structuredClone(document);

  mcpDocument.components = {
    ...mcpDocument.components,
    securitySchemes: {
      ...mcpDocument.components?.securitySchemes,
      oauth: {
        type: "oauth2",
        description: "OAuth 2.0 authentication",
        flows: {
          authorizationCode: {
            authorizationUrl: "https://app.dub.co/oauth/authorize",
            tokenUrl: "https://api.dub.co/oauth/token",
            scopes: Object.fromEntries(
              OAUTH_SCOPES.map((scope) => [
                scope,
                OAUTH_SCOPE_DESCRIPTIONS[
                  scope as keyof typeof OAUTH_SCOPE_DESCRIPTIONS
                ] ?? scope,
              ]),
            ),
          },
        },
      },
    },
  };

  mcpDocument.security = [{ token: [] }, { oauth: [] }];

  return mcpDocument;
}
