import { expect, test } from "vitest";
import { HttpClient } from "../utils/http";
import { Link } from "@prisma/client";
import { IntegrationHarness } from "../utils/integration";

const domain = "dub.sh";
const url = "https://github.com/dubinc";

const cases = [
  {
    name: "create link with domain not belonging to workspace",
    body: {
      domain: "google.com",
      url,
    },
    expected: {
      status: 403,
      data: {
        error: {
          code: "forbidden",
          message: "Domain does not belong to workspace.",
          doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
        },
      },
    },
  },
  {
    name: "create link with invalid destination url",
    body: {
      domain,
      url: "invalid",
    },
    expected: {
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message: "Invalid destination url.",
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable_entity",
        },
      },
    },
  },
  {
    name: "create link with invalid tag id",
    body: {
      domain,
      url,
      tagIds: ["invalid"],
    },
    expected: {
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message: "Invalid tagIds detected: invalid",
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable_entity",
        },
      },
    },
  },
  {
    name: "create link with invalid expiration date",
    body: {
      domain,
      url,
      expiresAt: new Date("2020-01-01").toISOString(),
    },
    expected: {
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message: "custom: expiresAt: Expiry date must be in the future.",
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable_entity",
        },
      },
    },
  },
];

cases.forEach(({ name, body, expected }) => {
  test(name, async (ctx) => {
    const h = new IntegrationHarness(ctx);
    const { workspace, apiKey } = await h.init();

    const http = new HttpClient({
      baseUrl: h.baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey.token}`,
      },
    });

    const response = await http.post<Link>({
      path: "/links",
      query: { workspaceId: workspace.workspaceId },
      body,
    });

    expect(response).toEqual(expected);
  });
});
