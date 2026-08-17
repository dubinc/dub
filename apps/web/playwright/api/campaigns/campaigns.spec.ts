import { DEFAULT_CAMPAIGN_BODY } from "@/lib/api/campaigns/constants";
import { expect } from "@playwright/test";
import type { CampaignType } from "@prisma/client";
import { apiError, randomName } from "../../utils";
import { test, type ApiClient } from "../fixtures";
import {
  campaignContent,
  createCampaign,
  defaultTransactionalTrigger,
  deleteCampaign,
  type CampaignJson,
} from "./helpers";

function defaultCampaign(type: CampaignType) {
  return {
    id: expect.any(String),
    name: "Untitled",
    subject: "",
    preview: null,
    from: null,
    bodyJson: DEFAULT_CAMPAIGN_BODY,
    type,
    status: "draft",
    triggerCondition:
      type === "transactional" ? defaultTransactionalTrigger : null,
    groups: [],
    scheduledAt: null,
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  };
}

async function createDraft(
  api: ApiClient,
  type: CampaignType = "transactional",
) {
  const { status, data } = await createCampaign(api, type);
  expect(status).toEqual(201);
  return data.id;
}

test("POST /campaigns – transactional", async ({ api }) => {
  let id: string | undefined;

  try {
    const { status, data } = await api.post<{ id: string }>("/api/campaigns", {
      type: "transactional",
    });
    id = data.id;

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      id: expect.any(String),
    });

    const { status: getStatus, data: campaign } = await api.get<CampaignJson>(
      `/api/campaigns/${id}`,
    );

    expect(getStatus).toEqual(200);
    expect(campaign).toStrictEqual(defaultCampaign("transactional"));
  } finally {
    await deleteCampaign(api, id);
  }
});

test("POST /campaigns – marketing", async ({ api }) => {
  let id: string | undefined;

  try {
    const { status, data } = await createCampaign(api, "marketing");
    id = data.id;

    expect(status).toEqual(201);
    expect(data).toStrictEqual({
      id: expect.any(String),
    });

    const { data: campaign } = await api.get<CampaignJson>(
      `/api/campaigns/${id}`,
    );

    expect(campaign).toStrictEqual(defaultCampaign("marketing"));
  } finally {
    await deleteCampaign(api, id);
  }
});

test("PATCH /campaigns/:id – update transactional content", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    id = await createDraft(api);

    const triggerCondition = {
      attribute: "totalConversions",
      operator: "gte",
      value: 50,
    } as const;

    const body = campaignContent({
      triggerCondition,
      groupIds: [program.defaultGroupId],
    });

    const { status, data } = await api.patch<CampaignJson>(
      `/api/campaigns/${id}`,
      body,
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      ...defaultCampaign("transactional"),
      id,
      name: body.name,
      subject: body.subject,
      bodyJson: body.bodyJson,
      triggerCondition,
      groups: [{ id: program.defaultGroupId }],
    });
  } finally {
    await deleteCampaign(api, id);
  }
});

test("PATCH /campaigns/:id – update marketing content", async ({
  api,
  program,
}) => {
  let id: string | undefined;
  const scheduledAt = "2026-12-01T00:00:00.000Z";

  try {
    id = await createDraft(api, "marketing");
    const body = campaignContent({
      groupIds: [program.defaultGroupId],
      scheduledAt,
      triggerCondition: {
        attribute: "totalConversions",
        operator: "gte",
        value: 50,
      },
    });

    const { status, data } = await api.patch<CampaignJson>(
      `/api/campaigns/${id}`,
      body,
    );

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      id,
      type: "marketing",
      name: body.name,
      subject: body.subject,
      bodyJson: body.bodyJson,
      triggerCondition: null,
      groups: [{ id: program.defaultGroupId }],
    });
    expect(data.scheduledAt).toEqual(scheduledAt);
  } finally {
    await deleteCampaign(api, id);
  }
});

test("PATCH /campaigns/:id – transactional ignores scheduledAt", async ({
  api,
}) => {
  let id: string | undefined;

  try {
    id = await createDraft(api);

    const { data } = await api.patch<CampaignJson>(`/api/campaigns/${id}`, {
      scheduledAt: "2026-12-01T00:00:00.000Z",
    });

    expect(data.scheduledAt).toBeNull();
  } finally {
    await deleteCampaign(api, id);
  }
});

test("GET /campaigns/:id", async ({ api }) => {
  let id: string | undefined;

  try {
    id = await createDraft(api);

    const { status, data } = await api.get<CampaignJson>(
      `/api/campaigns/${id}`,
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      ...defaultCampaign("transactional"),
      id,
    });
  } finally {
    await deleteCampaign(api, id);
  }
});

test("GET /campaigns – list by search", async ({ api }) => {
  let id: string | undefined;
  const name = randomName("campaign");

  try {
    id = await createDraft(api);
    await api.patch(`/api/campaigns/${id}`, { name });

    const { status, data: campaigns } = await api.get<CampaignJson[]>(
      `/api/campaigns?search=${encodeURIComponent(name)}`,
    );

    expect(status).toEqual(200);

    const { data: fetched } = await api.get<CampaignJson>(
      `/api/campaigns/${id}`,
    );

    expect(campaigns.find((campaign) => campaign.id === id)).toStrictEqual(
      fetched,
    );
  } finally {
    await deleteCampaign(api, id);
  }
});

test("PATCH /campaigns/:id – transactional status draft → active → paused → active", async ({
  api,
}) => {
  let id: string | undefined;

  try {
    id = await createDraft(api);

    const published = await api.patch<CampaignJson>(`/api/campaigns/${id}`, {
      status: "active",
    });
    expect(published.status).toEqual(200);
    expect(published.data.status).toEqual("active");

    const paused = await api.patch<CampaignJson>(`/api/campaigns/${id}`, {
      status: "paused",
    });
    expect(paused.status).toEqual(200);
    expect(paused.data.status).toEqual("paused");

    const resumed = await api.patch<CampaignJson>(`/api/campaigns/${id}`, {
      status: "active",
    });
    expect(resumed.status).toEqual(200);
    expect(resumed.data.status).toEqual("active");
  } finally {
    await deleteCampaign(api, id);
  }
});

test("PATCH /campaigns/:id – marketing status draft → scheduled → canceled", async ({
  api,
}) => {
  let id: string | undefined;
  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  try {
    id = await createDraft(api, "marketing");

    const scheduled = await api.patch<CampaignJson>(`/api/campaigns/${id}`, {
      status: "scheduled",
      scheduledAt,
    });
    expect(scheduled.status).toEqual(200);
    expect(scheduled.data.status).toEqual("scheduled");

    const canceled = await api.patch<CampaignJson>(`/api/campaigns/${id}`, {
      status: "canceled",
    });
    expect(canceled.status).toEqual(200);
    expect(canceled.data.status).toEqual("canceled");
  } finally {
    await deleteCampaign(api, id);
  }
});

test("POST /campaigns/:id/duplicate – transactional", async ({
  api,
  program,
}) => {
  let id: string | undefined;
  let duplicateId: string | undefined;

  const triggerCondition = {
    attribute: "totalConversions",
    operator: "gte",
    value: 50,
  } as const;

  const body = campaignContent({
    triggerCondition,
    groupIds: [program.defaultGroupId],
  });

  try {
    id = await createDraft(api);
    await api.patch(`/api/campaigns/${id}`, body);

    const { status, data } = await api.post<{ id: string }>(
      `/api/campaigns/${id}/duplicate`,
    );
    duplicateId = data.id;

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      id: expect.any(String),
    });

    const { data: duplicated } = await api.get<CampaignJson>(
      `/api/campaigns/${duplicateId}`,
    );

    expect(duplicated).toStrictEqual({
      ...defaultCampaign("transactional"),
      id: duplicateId,
      name: `${body.name} (copy)`,
      subject: body.subject,
      bodyJson: body.bodyJson,
      triggerCondition,
      groups: [{ id: program.defaultGroupId }],
      status: "draft",
    });
  } finally {
    await deleteCampaign(api, duplicateId);
    await deleteCampaign(api, id);
  }
});

test("POST /campaigns/:id/duplicate – marketing", async ({ api }) => {
  let id: string | undefined;
  let duplicateId: string | undefined;
  const body = campaignContent();

  try {
    id = await createDraft(api, "marketing");
    await api.patch(`/api/campaigns/${id}`, body);

    const { status, data } = await api.post<{ id: string }>(
      `/api/campaigns/${id}/duplicate`,
    );
    duplicateId = data.id;

    expect(status).toEqual(200);

    const { data: duplicated } = await api.get<CampaignJson>(
      `/api/campaigns/${duplicateId}`,
    );

    expect(duplicated).toMatchObject({
      id: duplicateId,
      type: "marketing",
      name: `${body.name} (copy)`,
      subject: body.subject,
      bodyJson: body.bodyJson,
      triggerCondition: null,
      status: "draft",
    });
  } finally {
    await deleteCampaign(api, duplicateId);
    await deleteCampaign(api, id);
  }
});

test("DELETE /campaigns/:id", async ({ api }) => {
  const id = await createDraft(api);

  const { status, data } = await api.delete<{ id: string }>(
    `/api/campaigns/${id}`,
  );

  expect(status).toEqual(200);
  expect(data).toStrictEqual({ id });
  expect(await api.get(`/api/campaigns/${id}`)).toEqual(
    apiError({
      code: "not_found",
      message: "Campaign not found.",
    }),
  );
});

const errorCases = [
  {
    name: "POST /campaigns – missing type",
    body: {},
    expected: apiError({
      code: "unprocessable_entity",
      message:
        'invalid_value: type: Invalid option: expected one of "marketing"|"transactional"',
    }),
  },
  {
    name: "POST /campaigns – invalid type",
    body: { type: "invalid" },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        'invalid_value: type: Invalid option: expected one of "marketing"|"transactional"',
    }),
  },
];

for (const { name, body, expected } of errorCases) {
  test(name, async ({ api }) => {
    expect(await api.post("/api/campaigns", body)).toEqual(expected);
  });
}

test("GET /campaigns/:id – not found", async ({ api }) => {
  expect(await api.get("/api/campaigns/cmp_does_not_exist")).toEqual(
    apiError({
      code: "not_found",
      message: "Campaign not found.",
    }),
  );
});

test("PATCH /campaigns/:id – marketing draft cannot become active", async ({
  api,
}) => {
  let id: string | undefined;

  try {
    id = await createDraft(api, "marketing");
    expect(
      await api.patch(`/api/campaigns/${id}`, { status: "active" }),
    ).toEqual(
      apiError({
        code: "bad_request",
        message: "A draft campaign can't be moved to active.",
      }),
    );
  } finally {
    await deleteCampaign(api, id);
  }
});

test("PATCH /campaigns/:id – transactional draft cannot become scheduled", async ({
  api,
}) => {
  let id: string | undefined;

  try {
    id = await createDraft(api);
    expect(
      await api.patch(`/api/campaigns/${id}`, { status: "scheduled" }),
    ).toEqual(
      apiError({
        code: "bad_request",
        message: "A draft campaign can't be moved to scheduled.",
      }),
    );
  } finally {
    await deleteCampaign(api, id);
  }
});
