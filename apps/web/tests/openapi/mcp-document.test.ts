import { OAUTH_SCOPES } from "@/lib/api/oauth/constants";
import { document } from "@/lib/openapi";
import { getMcpDocument } from "@/lib/openapi/mcp-document";
import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("getMcpDocument", () => {
  test("adds the OAuth security scheme with every OAuth scope", () => {
    const { components } = getMcpDocument();

    expect(components?.securitySchemes?.token).toEqual(
      document.components?.securitySchemes?.token,
    );
    expect(components?.securitySchemes?.oauth).toMatchObject({
      type: "oauth2",
      flows: {
        authorizationCode: {
          authorizationUrl: "https://app.dub.co/oauth/authorize",
          tokenUrl: "https://api.dub.co/oauth/token",
        },
      },
    });
    expect(
      Object.keys(
        (components?.securitySchemes?.oauth as any).flows.authorizationCode
          .scopes,
      ),
    ).toEqual([...OAUTH_SCOPES]);
  });

  test("accepts either the API key or OAuth at the document level", () => {
    expect(getMcpDocument().security).toEqual([{ token: [] }, { oauth: [] }]);
  });

  test("leaves paths and the default document unchanged", () => {
    const mcpDocument = getMcpDocument();

    expect(mcpDocument.paths).toEqual(document.paths);
    expect(document.security).toBeUndefined();
    expect(document.components?.securitySchemes).not.toHaveProperty("oauth");
  });
});
