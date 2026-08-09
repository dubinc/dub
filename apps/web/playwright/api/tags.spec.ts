import { expect } from "@playwright/test";
import type { Tag } from "@prisma/client";
import { randomName } from "../utils";
import { test } from "./fixtures";

test.describe.configure({
  mode: "parallel",
});

test("POST /tags", async ({ api }) => {
  let tagId: string | undefined;

  try {
    const newTag = {
      name: randomName("tag"),
      color: "red",
    };

    const { status, data: tag } = await api.post<Tag>("/api/tags", newTag);
    tagId = tag.id;

    expect(status).toEqual(201);
    expect(tag).toStrictEqual({
      id: expect.any(String),
      ...newTag,
    });
  } finally {
    if (tagId) await api.delete(`/api/tags/${tagId}`);
  }
});

const errorCases = [
  {
    name: "POST /tags – invalid color",
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
            "invalid_value: color: Invalid color. Must be one of: red, yellow, green, blue, purple, brown, gray, pink", // TODO: update this to use RESOURCE_COLORS
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable-entity",
        },
      },
    },
  },
  {
    name: "POST /tags – without name",
    body: {
      color: "red",
    },
    expected: {
      status: 422,
      data: {
        error: {
          code: "unprocessable_entity",
          message: "custom: name: Name is required.",
          doc_url:
            "https://dub.co/docs/api-reference/errors#unprocessable-entity",
        },
      },
    },
  },
];

for (const { name, body, expected } of errorCases) {
  test(name, async ({ api }) => {
    const response = await api.post("/api/tags", body);
    expect(response).toEqual(expected);
  });
}

test("POST /tags – existing name", async ({ api }) => {
  let tagId: string | undefined;
  const tagName = randomName("tag");

  try {
    const { data: created } = await api.post<Tag>("/api/tags", {
      tag: tagName,
      color: "red",
    });
    tagId = created.id;

    // Create the same tag again
    const { status, data: error } = await api.post("/api/tags", {
      tag: tagName,
      color: "red",
    });

    expect(status).toBe(409);
    expect(error).toEqual({
      error: {
        code: "conflict",
        message: "A tag with that name already exists.",
        doc_url: "https://dub.co/docs/api-reference/errors#conflict",
      },
    });
  } finally {
    if (tagId) await api.delete(`/api/tags/${tagId}`);
  }
});

test("GET /tags", async ({ api }) => {
  let tagId: string | undefined;

  try {
    const newTag = {
      tag: randomName("tag"),
      color: "red",
    };

    const { data: tagCreated } = await api.post<Tag>("/api/tags", newTag);
    tagId = tagCreated.id;

    const { status, data: tags } = await api.get<Tag[]>(
      "/api/tags?sortBy=createdAt&sortOrder=desc",
    );

    expect(status).toEqual(200);
    expect(tags).toEqual(
      expect.arrayContaining([
        {
          id: tagCreated.id,
          name: tagCreated.name,
          color: tagCreated.color,
        },
      ]),
    );
  } finally {
    if (tagId) await api.delete(`/api/tags/${tagId}`);
  }
});
