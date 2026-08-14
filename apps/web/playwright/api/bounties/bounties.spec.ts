import type { BountyProps } from "@/lib/types";
import { expect } from "@playwright/test";
import { BountyStartMode, type Program } from "@prisma/client";
import { addDays, addMonths, subDays } from "date-fns";
import { randomName } from "../../utils";
import { test, type ApiClient } from "../fixtures";

test.describe.configure({
  mode: "parallel",
});

type BountyJson = Omit<
  BountyProps,
  "startsAt" | "endsAt" | "submissionsOpenAt" | "socialMetricsLastSyncedAt"
> & {
  startsAt: string | null;
  endsAt: string | null;
  submissionsOpenAt: string | null;
  socialMetricsLastSyncedAt?: string | null;
};

type ProgramFixture = Pick<Program, "id" | "defaultGroupId">;

function futureStartsAt() {
  return new Date(Date.now() + 5 * 60 * 1000).toISOString();
}

function bountyPayload(
  program: ProgramFixture,
  overrides: Record<string, unknown> = {},
) {
  return {
    name: randomName("bounty"),
    description: "some description about the bounty",
    type: "submission",
    startsAt: futureStartsAt(),
    endsAt: null,
    rewardAmount: 1000,
    submissionRequirements: {
      image: { max: 4 },
      url: { max: 10 },
    },
    groupIds: [program.defaultGroupId],
    ...overrides,
  };
}

async function createBounty(
  api: ApiClient,
  program: ProgramFixture,
  overrides: Record<string, unknown> = {},
) {
  return api.post<BountyJson>("/api/bounties", {
    ...bountyPayload(program, overrides),
  });
}

async function deleteBounty(api: ApiClient, id: string | undefined) {
  if (!id) return;
  await api.delete(`/api/bounties/${id}`);
}

const expectedBountyDefaults = {
  id: expect.any(String),
  endsAt: null,
  startMode: "absolute",
  endsAfterDays: null,
  submissionsOpenAt: null,
  submissionFrequency: null,
  maxSubmissions: 1,
  rewardDescription: null,
  performanceCondition: null,
  performanceScope: null,
  socialMetricsLastSyncedAt: null,
};

const unprocessable = (message: string) => ({
  status: 422,
  data: {
    error: {
      code: "unprocessable_entity",
      message,
      doc_url: "https://dub.co/docs/api-reference/errors#unprocessable-entity",
    },
  },
});

const badRequest = (message: string) => ({
  status: 400,
  data: {
    error: {
      code: "bad_request",
      message,
      doc_url: "https://dub.co/docs/api-reference/errors#bad-request",
    },
  },
});

const notFound = (bountyId: string) => ({
  status: 404,
  data: {
    error: {
      code: "not_found",
      message: `Bounty ${bountyId} not found.`,
      doc_url: "https://dub.co/docs/api-reference/errors#not-found",
    },
  },
});

test("POST /bounties", async ({ api, program }) => {
  let id: string | undefined;
  const body = bountyPayload(program);

  try {
    const { status, data } = await api.post<BountyJson>("/api/bounties", body);
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toStrictEqual({
      ...expectedBountyDefaults,
      name: body.name,
      description: body.description,
      type: "submission",
      startsAt: body.startsAt,
      rewardAmount: 1000,
      submissionRequirements: body.submissionRequirements,
      groups: [{ id: program.defaultGroupId }],
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("POST /bounties – performance based", async ({ api, program }) => {
  let id: string | undefined;

  try {
    const { status, data } = await createBounty(api, program, {
      name: "ignored",
      description: "some description about the bounty",
      type: "performance",
      submissionRequirements: undefined,
      performanceScope: "new",
      performanceCondition: {
        attribute: "totalLeads",
        operator: "gte",
        value: 100,
      },
    });
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      id: expect.any(String),
      name: "Earn $10 after generating 100 leads",
      type: "performance",
      rewardAmount: 1000,
      performanceScope: "new",
      performanceCondition: {
        attribute: "totalLeads",
        operator: "gte",
        value: 100,
      },
      maxSubmissions: 1,
      submissionFrequency: null,
      submissionRequirements: null,
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("POST /bounties – performance based with performanceScope set to new", async ({
  api,
  program,
}) => {
  let id: string | undefined;
  const name = randomName("bounty");

  try {
    const { status, data } = await createBounty(api, program, {
      name,
      type: "performance",
      submissionRequirements: undefined,
      performanceScope: "new",
    });
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      name,
      type: "performance",
      performanceScope: "new",
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("POST /bounties – submission based with rewardDescription", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    const { status, data } = await createBounty(api, program, {
      rewardAmount: null,
      rewardDescription: "some reward description",
    });
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      rewardAmount: null,
      rewardDescription: "some reward description",
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("POST /bounties – submission based with submissionsOpenAt", async ({
  api,
  program,
}) => {
  let id: string | undefined;
  const now = new Date();
  const startsAt = addDays(now, 1);
  const endsAt = addDays(startsAt, 30);
  const submissionsOpenAt = subDays(endsAt, 2);

  try {
    const { status, data } = await createBounty(api, program, {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      submissionsOpenAt: submissionsOpenAt.toISOString(),
    });
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      submissionsOpenAt: submissionsOpenAt.toISOString(),
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("GET /bounties/{bountyId}", async ({ api, program }) => {
  let id: string | undefined;

  try {
    const { data: created } = await createBounty(api, program);
    id = created.id;

    const { status, data } = await api.get<BountyJson>(`/api/bounties/${id}`);

    expect(status).toEqual(200);
    expect(data).toStrictEqual(created);
  } finally {
    await deleteBounty(api, id);
  }
});

test("GET /bounties", async ({ api, program }) => {
  let id: string | undefined;

  try {
    const { data: created } = await createBounty(api, program);
    id = created.id;

    const { status, data } = await api.get<BountyJson[]>("/api/bounties");

    expect(status).toEqual(200);
    expect(data).toEqual(expect.arrayContaining([created]));
  } finally {
    await deleteBounty(api, id);
  }
});

test("GET /bounties/{bountyId}/submissions", async ({ api, program }) => {
  let id: string | undefined;

  try {
    const { data: created } = await createBounty(api, program);
    id = created.id;

    const { status, data } = await api.get(`/api/bounties/${id}/submissions`);

    expect(status).toEqual(200);
    expect(data).toEqual([]);
  } finally {
    await deleteBounty(api, id);
  }
});

test("PATCH /bounties/{bountyId}", async ({ api, program }) => {
  let id: string | undefined;

  try {
    const { data: created } = await createBounty(api, program);
    id = created.id;

    const endsAt = addDays(new Date(), 30).toISOString();
    const toUpdate = {
      name: `${created.name} updated`,
      endsAt,
      rewardAmount: 2000,
    };

    const { status, data } = await api.patch<BountyJson>(
      `/api/bounties/${id}`,
      {
        ...toUpdate,
        type: "performance",
      },
    );

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      ...toUpdate,
      type: "submission",
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("DELETE /bounties/{bountyId}", async ({ api, program }) => {
  const { data: created } = await createBounty(api, program);

  const { status, data } = await api.delete<{ id: string }>(
    `/api/bounties/${created.id}`,
  );

  expect(status).toEqual(200);
  expect(data).toStrictEqual({ id: created.id });
  expect(await api.get(`/api/bounties/${created.id}`)).toEqual(
    notFound(created.id),
  );
});

test("POST /bounties – maxSubmissions persists for submission bounty", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    const { status, data } = await createBounty(api, program, {
      maxSubmissions: 5,
    });
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      maxSubmissions: 5,
      submissionFrequency: null,
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("POST /bounties – submissionFrequency week with maxSubmissions", async ({
  api,
  program,
}) => {
  let id: string | undefined;
  const startsAt = futureStartsAt();
  const endsAt = addMonths(new Date(startsAt), 1).toISOString();

  try {
    const { status, data } = await createBounty(api, program, {
      startsAt,
      endsAt,
      maxSubmissions: 4,
      submissionFrequency: "week",
    });
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      maxSubmissions: 4,
      submissionFrequency: "week",
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("POST /bounties – submissionFrequency month with maxSubmissions", async ({
  api,
  program,
}) => {
  let id: string | undefined;
  const startsAt = futureStartsAt();
  const endsAt = addMonths(new Date(startsAt), 1).toISOString();

  try {
    const { status, data } = await createBounty(api, program, {
      startsAt,
      endsAt,
      maxSubmissions: 3,
      submissionFrequency: "month",
    });
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      maxSubmissions: 3,
      submissionFrequency: "month",
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("POST /bounties – maxSubmissions and submissionFrequency are ignored for performance bounties", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    const { status, data } = await createBounty(api, program, {
      type: "performance",
      submissionRequirements: undefined,
      performanceScope: "new",
      performanceCondition: {
        attribute: "totalLeads",
        operator: "gte",
        value: 50,
      },
      maxSubmissions: 5,
      submissionFrequency: "week",
    });
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      maxSubmissions: 1,
      submissionFrequency: null,
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("POST /bounties – submissionFrequency with relative endsAfterDays is accepted", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    const { status, data } = await createBounty(api, program, {
      startMode: BountyStartMode.relative,
      startsAt: null,
      endsAt: null,
      endsAfterDays: 30,
      maxSubmissions: 4,
      submissionFrequency: "week",
    });
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      startMode: BountyStartMode.relative,
      startsAt: null,
      endsAt: null,
      endsAfterDays: 30,
      maxSubmissions: 4,
      submissionFrequency: "week",
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("PATCH /bounties/{bountyId} – update maxSubmissions", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    const { data: created } = await createBounty(api, program, {
      maxSubmissions: 5,
    });
    id = created.id;

    const { status, data } = await api.patch<BountyJson>(
      `/api/bounties/${id}`,
      { maxSubmissions: 6 },
    );

    expect(status).toEqual(200);
    expect(data).toMatchObject({ maxSubmissions: 6 });
  } finally {
    await deleteBounty(api, id);
  }
});

test("PATCH /bounties/{bountyId} – update submissionFrequency", async ({
  api,
  program,
}) => {
  let id: string | undefined;
  const startsAt = futureStartsAt();
  const endsAt = addMonths(new Date(startsAt), 1).toISOString();

  try {
    const { data: created } = await createBounty(api, program, {
      startsAt,
      endsAt,
      maxSubmissions: 3,
      submissionFrequency: "month",
    });
    id = created.id;

    const { status, data } = await api.patch<BountyJson>(
      `/api/bounties/${id}`,
      { submissionFrequency: "day" },
    );

    expect(status).toEqual(200);
    expect(data).toMatchObject({ submissionFrequency: "day" });
  } finally {
    await deleteBounty(api, id);
  }
});

test("PATCH /bounties/{bountyId} – clear submissionFrequency to null", async ({
  api,
  program,
}) => {
  let id: string | undefined;
  const startsAt = futureStartsAt();
  const endsAt = addMonths(new Date(startsAt), 1).toISOString();

  try {
    const { data: created } = await createBounty(api, program, {
      startsAt,
      endsAt,
      maxSubmissions: 3,
      submissionFrequency: "month",
    });
    id = created.id;

    const { status, data } = await api.patch<BountyJson>(
      `/api/bounties/${id}`,
      { submissionFrequency: null },
    );

    expect(status).toEqual(200);
    expect(data).toMatchObject({ submissionFrequency: null });
  } finally {
    await deleteBounty(api, id);
  }
});

test("PATCH /bounties/{bountyId} – clear maxSubmissions to null", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    const { data: created } = await createBounty(api, program, {
      maxSubmissions: 5,
    });
    id = created.id;

    const { status, data } = await api.patch<BountyJson>(
      `/api/bounties/${id}`,
      { maxSubmissions: null },
    );

    expect(status).toEqual(200);
    expect(data).toMatchObject({ maxSubmissions: 1 });
  } finally {
    await deleteBounty(api, id);
  }
});

test("PATCH /bounties/{bountyId} – update submissionsOpenAt", async ({
  api,
  program,
}) => {
  let id: string | undefined;
  const startsAt = futureStartsAt();
  const endsAt = addMonths(new Date(startsAt), 1).toISOString();
  const submissionsOpenAt = addDays(new Date(startsAt), 5).toISOString();

  try {
    const { data: created } = await createBounty(api, program, {
      startsAt,
      endsAt,
    });
    id = created.id;

    const { status, data } = await api.patch<BountyJson>(
      `/api/bounties/${id}`,
      { submissionsOpenAt },
    );

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      submissionsOpenAt: expect.any(String),
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("POST /bounties – relative with endsAfterDays", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    const { status, data } = await createBounty(api, program, {
      startMode: BountyStartMode.relative,
      startsAt: null,
      endsAt: null,
      endsAfterDays: 30,
    });
    id = data.id;

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      startMode: BountyStartMode.relative,
      startsAt: null,
      endsAt: null,
      endsAfterDays: 30,
    });

    const { status: patchStatus, data: updated } = await api.patch<BountyJson>(
      `/api/bounties/${id}`,
      { endsAfterDays: 180 },
    );

    expect(patchStatus).toEqual(200);
    expect(updated).toMatchObject({
      startMode: BountyStartMode.relative,
      startsAt: null,
      endsAfterDays: 180,
    });
  } finally {
    await deleteBounty(api, id);
  }
});

test("PATCH /bounties/{bountyId} – submissionFrequency requires endsAt on the bounty", async ({
  api,
  program,
}) => {
  let id: string | undefined;
  const startsAt = futureStartsAt();
  const endsAt = addMonths(new Date(startsAt), 1).toISOString();

  try {
    const { data: created } = await createBounty(api, program, {
      startsAt,
      endsAt,
    });
    id = created.id;

    const { status: clearStatus } = await api.patch(`/api/bounties/${id}`, {
      endsAt: null,
    });
    expect(clearStatus).toEqual(200);

    expect(
      await api.patch(`/api/bounties/${id}`, {
        submissionFrequency: "week",
        maxSubmissions: 4,
      }),
    ).toEqual(
      badRequest(
        "`endsAt` or `endsAfterDays` is required when `submissionFrequency` is set.",
      ),
    );
  } finally {
    await deleteBounty(api, id);
  }
});

test("PATCH /bounties/{bountyId} – submissionsOpenAt without endsAt is rejected", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    const { data: created } = await createBounty(api, program);
    id = created.id;

    expect(
      await api.patch(`/api/bounties/${id}`, {
        submissionsOpenAt: addDays(new Date(), 5).toISOString(),
      }),
    ).toEqual(
      badRequest("`endsAt` is required when `submissionsOpenAt` is set."),
    );
  } finally {
    await deleteBounty(api, id);
  }
});

test("PATCH /bounties/{bountyId} – maxSubmissions below minimum is rejected", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    const { data: created } = await createBounty(api, program);
    id = created.id;

    expect(
      await api.patch(`/api/bounties/${id}`, { maxSubmissions: 1 }),
    ).toEqual(
      unprocessable(
        "too_small: maxSubmissions: If `maxSubmissions` is set, it must be at least 2",
      ),
    );
  } finally {
    await deleteBounty(api, id);
  }
});

test("PATCH /bounties/{bountyId} – maxSubmissions above maximum is rejected", async ({
  api,
  program,
}) => {
  let id: string | undefined;

  try {
    const { data: created } = await createBounty(api, program);
    id = created.id;

    expect(
      await api.patch(`/api/bounties/${id}`, { maxSubmissions: 51 }),
    ).toEqual(
      unprocessable(
        "too_big: maxSubmissions: Too big: expected number to be <=50",
      ),
    );
  } finally {
    await deleteBounty(api, id);
  }
});

test("POST /bounties – invalid group IDs", async ({ api, program }) => {
  expect(
    await api.post("/api/bounties", {
      ...bountyPayload(program, { groupIds: ["invalid-group-id"] }),
    }),
  ).toEqual(badRequest("Invalid group IDs detected: invalid-group-id"));
});

test("POST /bounties – maxSubmissions below minimum is rejected", async ({
  api,
  program,
}) => {
  expect(
    await api.post("/api/bounties", {
      ...bountyPayload(program, { maxSubmissions: 1 }),
    }),
  ).toEqual(
    unprocessable(
      "too_small: maxSubmissions: If `maxSubmissions` is set, it must be at least 2",
    ),
  );
});

test("POST /bounties – maxSubmissions above maximum is rejected", async ({
  api,
  program,
}) => {
  expect(
    await api.post("/api/bounties", {
      ...bountyPayload(program, { maxSubmissions: 51 }),
    }),
  ).toEqual(
    unprocessable(
      "too_big: maxSubmissions: Too big: expected number to be <=50",
    ),
  );
});

test("POST /bounties – submissionFrequency without maxSubmissions is rejected", async ({
  api,
  program,
}) => {
  const startsAt = futureStartsAt();
  const endsAt = addMonths(new Date(startsAt), 1).toISOString();

  expect(
    await api.post("/api/bounties", {
      ...bountyPayload(program, {
        startsAt,
        endsAt,
        submissionFrequency: "week",
      }),
    }),
  ).toEqual(
    badRequest(
      "`maxSubmissions` is required when `submissionFrequency` is set.",
    ),
  );
});

test("POST /bounties – submissionFrequency without endsAt is rejected", async ({
  api,
  program,
}) => {
  expect(
    await api.post("/api/bounties", {
      ...bountyPayload(program, {
        endsAt: null,
        maxSubmissions: 4,
        submissionFrequency: "week",
      }),
    }),
  ).toEqual(
    badRequest(
      "`endsAt` or `endsAfterDays` is required when `submissionFrequency` is set.",
    ),
  );
});

test("POST /bounties – submissionsOpenAt without endsAt is rejected", async ({
  api,
  program,
}) => {
  const startsAt = futureStartsAt();

  expect(
    await api.post("/api/bounties", {
      ...bountyPayload(program, {
        startsAt,
        endsAt: null,
        submissionsOpenAt: addDays(new Date(startsAt), 5).toISOString(),
      }),
    }),
  ).toEqual(
    badRequest("`endsAt` is required when `submissionsOpenAt` is set."),
  );
});

test("POST /bounties – submissionsOpenAt before startsAt is rejected", async ({
  api,
  program,
}) => {
  const startsAt = futureStartsAt();
  const endsAt = addMonths(new Date(startsAt), 1).toISOString();

  expect(
    await api.post("/api/bounties", {
      ...bountyPayload(program, {
        startsAt,
        endsAt,
        submissionsOpenAt: subDays(new Date(startsAt), 1).toISOString(),
      }),
    }),
  ).toEqual(badRequest("`submissionsOpenAt` must be on or after `startsAt`."));
});

test("POST /bounties – submissionsOpenAt after endsAt is rejected", async ({
  api,
  program,
}) => {
  const startsAt = futureStartsAt();
  const endsAt = addMonths(new Date(startsAt), 1).toISOString();

  expect(
    await api.post("/api/bounties", {
      ...bountyPayload(program, {
        startsAt,
        endsAt,
        submissionsOpenAt: addDays(new Date(endsAt), 1).toISOString(),
      }),
    }),
  ).toEqual(badRequest("`submissionsOpenAt` must be on or before `endsAt`."));
});

test("POST /bounties – relative with startsAt is rejected", async ({
  api,
  program,
}) => {
  expect(
    await api.post("/api/bounties", {
      ...bountyPayload(program, {
        startMode: BountyStartMode.relative,
        startsAt: futureStartsAt(),
        endsAfterDays: 30,
      }),
    }),
  ).toEqual(
    badRequest(
      "`startsAt` is not supported when the `startMode` is `relative`.",
    ),
  );
});

test("POST /bounties – both endsAt and endsAfterDays is rejected", async ({
  api,
  program,
}) => {
  expect(
    await api.post("/api/bounties", {
      ...bountyPayload(program, {
        startMode: BountyStartMode.relative,
        startsAt: null,
        endsAt: addDays(new Date(), 30).toISOString(),
        endsAfterDays: 30,
      }),
    }),
  ).toEqual(
    badRequest("Bounties cannot have both `endsAt` and `endsAfterDays`."),
  );
});

const unknownBountyId = "bnty_does_not_exist";

test("GET /bounties/{bountyId} – not found", async ({ api }) => {
  expect(await api.get(`/api/bounties/${unknownBountyId}`)).toEqual(
    notFound(unknownBountyId),
  );
});

test("PATCH /bounties/{bountyId} – not found", async ({ api }) => {
  expect(
    await api.patch(`/api/bounties/${unknownBountyId}`, { name: "x" }),
  ).toEqual(notFound(unknownBountyId));
});

test("DELETE /bounties/{bountyId} – not found", async ({ api }) => {
  expect(await api.delete(`/api/bounties/${unknownBountyId}`)).toEqual(
    notFound(unknownBountyId),
  );
});
