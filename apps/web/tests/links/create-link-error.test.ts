import { Link } from "@dub/prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK } from "../utils/resource";

const { domain, url } = E2E_LINK;

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
    name: "create link with invalid destination URL",
    body: {
      domain,
      url: "invalid",
    },
    expected: {
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message: "Invalid destination URL",
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable-entity",
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
            "https://dub.co/docs/api-reference/errors#unprocessable-entity",
        },
      },
    },
  },
];

cases.forEach(({ name, body, expected }) => {
  test(name, async (ctx) => {
    const h = new IntegrationHarness(ctx);
    const { http } = await h.init();

    const response = await http.post<Link>({
      path: "/links",
      body,
    });

    expect(response).toEqual(expected);
  });
});
