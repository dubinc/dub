import { Tag } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

const cases = [
  {
    name: "create tag with invalid color",
    body: {
      tag: "news",
      color: "invalid",
    },
    expected: {
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message:
            "invalid_enum_value: color: Invalid color. Must be one of: red, yellow, green, blue, purple, pink, brown",
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable-entity",
        },
      },
    },
  },
  {
    name: "create tag without name",
    body: {
      color: "red",
    },
    expected: {
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message: "invalid_type: tag: Required",
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

    const response = await http.post<Tag>({
      path: "/tags",
      body,
    });

    expect(response).toEqual(expected);
  });
});

test("create tag with existing name", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { http } = await h.init();

  await http.post({
    path: "/tags",
    body: {
      tag: "news",
      color: "red",
    },
  });

  // Create the same tag again
  const { status, data: error } = await http.post<Tag>({
    path: "/tags",
    body: {
      tag: "news",
      color: "red",
    },
  });

  expect(status).toBe(409);
  expect(error).toEqual({
    error: {
      code: "conflict",
      message: "A tag with that name already exists.",
      doc_url: "https://dub.co/docs/api-reference/errors#conflict",
    },
  });
});
