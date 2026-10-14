import { expect } from "@playwright/test";
import type { UtmTemplate } from "@prisma/client";
import { apiError, randomName } from "../../utils";
import { test, type ApiClient } from "../fixtures";

type UtmTemplateResponse = Pick<
  UtmTemplate,
  | "id"
  | "name"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_term"
  | "utm_content"
  | "ref"
  | "userId"
  | "projectId"
> & {
  createdAt: string;
  updatedAt: string;
};

const expectedUtmTemplate = {
  id: expect.any(String),
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
  ref: null,
  userId: expect.any(String),
  projectId: expect.any(String),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

async function createUtmTemplate(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  return api.post<UtmTemplateResponse>("/api/utm", {
    name: randomName("utm"),
    ...overrides,
  });
}

async function deleteUtmTemplate(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/utm/${id}`);
}

test("POST /utm", async ({ api, workspace }) => {
  let id: string | undefined;
  const body = {
    name: randomName("utm"),
    utm_source: "facebook",
    utm_medium: "social",
    utm_campaign: "summer",
    utm_term: "shoes",
    utm_content: "cta",
    ref: "partner",
  };

  try {
    const { status, data } = await api.post<UtmTemplateResponse>(
      "/api/utm",
      body,
    );
    id = data.id;

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      ...expectedUtmTemplate,
      ...body,
      projectId: workspace.id,
    });
  } finally {
    await deleteUtmTemplate(api, id);
  }
});

test("POST /utm – utm tag at max length", async ({ api }) => {
  let id: string | undefined;
  const utmSource = "a".repeat(255);

  try {
    const { status, data } = await createUtmTemplate(api, {
      utm_source: utmSource,
    });
    id = data.id;

    expect(status).toEqual(201);
    expect(data.utm_source).toBe(utmSource);
  } finally {
    await deleteUtmTemplate(api, id);
  }
});

test("POST /utm – empty utm tags become null", async ({ api }) => {
  let id: string | undefined;

  try {
    const { status, data } = await createUtmTemplate(api, {
      utm_source: "",
      utm_medium: "",
    });
    id = data.id;

    expect(status).toEqual(201);
    expect(data.utm_source).toBeNull();
    expect(data.utm_medium).toBeNull();
  } finally {
    await deleteUtmTemplate(api, id);
  }
});

const errorCases = [
  {
    name: "POST /utm – missing name",
    body: {},
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "invalid_type: name: Invalid input: expected string, received undefined",
    }),
  },
  {
    name: "POST /utm – empty name",
    body: { name: "" },
    expected: apiError({
      code: "unprocessable_entity",
      message: "too_small: name: UTM name is required",
    }),
  },
  {
    name: "POST /utm – name too long",
    body: { name: "a".repeat(51) },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "too_big: name: Too big: expected string to have <=50 characters",
    }),
  },
  {
    name: "POST /utm – utm_source too long",
    body: { name: randomName("utm"), utm_source: "a".repeat(256) },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "too_big: utm_source: Too big: expected string to have <=255 characters",
    }),
  },
];

for (const { name, body, expected } of errorCases) {
  test(name, async ({ api }) => {
    expect(await api.post("/api/utm", body)).toEqual(expected);
  });
}

test("POST /utm – existing name", async ({ api }) => {
  let id: string | undefined;
  const templateName = randomName("utm");

  try {
    const { data: created } = await createUtmTemplate(api, {
      name: templateName,
    });
    id = created.id;

    const { status, data: error } = await api.post("/api/utm", {
      name: templateName,
    });

    expect({ status, data: error }).toEqual(
      apiError({
        code: "conflict",
        message: "A template with that name already exists.",
      }),
    );
  } finally {
    await deleteUtmTemplate(api, id);
  }
});

test("GET /utm", async ({ api }) => {
  let id: string | undefined;

  try {
    const { data: created } = await createUtmTemplate(api, {
      utm_source: "google",
      utm_medium: "cpc",
    });
    id = created.id;

    const { status, data: templates } =
      await api.get<(UtmTemplateResponse & { user: { id: string } })[]>(
        "/api/utm",
      );

    expect(status).toEqual(200);
    expect(templates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.id,
          name: created.name,
          utm_source: "google",
          utm_medium: "cpc",
          user: expect.objectContaining({ id: created.userId }),
        }),
      ]),
    );
  } finally {
    await deleteUtmTemplate(api, id);
  }
});

test("PATCH /utm/{id}", async ({ api }) => {
  let id: string | undefined;
  const name = randomName("utm");

  try {
    const { data: created } = await createUtmTemplate(api, {
      name,
      utm_source: "facebook",
      utm_medium: "social",
    });
    id = created.id;

    const update = {
      name: `${name}-updated`,
      utm_source: "twitter",
      utm_medium: null,
      utm_campaign: "launch",
      utm_term: null,
      utm_content: null,
      ref: "blog",
    };

    const { status, data } = await api.patch<
      UtmTemplateResponse & { partnerGroup: null }
    >(`/api/utm/${id}`, update);

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      ...expectedUtmTemplate,
      ...update,
      id: created.id,
      userId: created.userId,
      projectId: created.projectId,
      createdAt: created.createdAt,
      updatedAt: expect.any(String),
      partnerGroup: null,
    });
  } finally {
    await deleteUtmTemplate(api, id);
  }
});

test("PATCH /utm/{id} – not found", async ({ api }) => {
  expect(
    await api.patch("/api/utm/utm_missing", { name: randomName("utm") }),
  ).toEqual(
    apiError({
      code: "not_found",
      message: "Template not found.",
    }),
  );
});

test("DELETE /utm/{id}", async ({ api }) => {
  const { data: created } = await createUtmTemplate(api);

  const { status, data } = await api.delete<{ id: string }>(
    `/api/utm/${created.id}`,
  );

  expect(status).toEqual(200);
  expect(data).toStrictEqual({ id: created.id });

  expect(
    await api.patch(`/api/utm/${created.id}`, { name: randomName("utm") }),
  ).toMatchObject({
    status: 404,
  });
});

test("DELETE /utm/{id} – not found", async ({ api }) => {
  expect(await api.delete("/api/utm/utm_missing")).toEqual(
    apiError({
      code: "not_found",
      message: "UTM template not found.",
    }),
  );
});
