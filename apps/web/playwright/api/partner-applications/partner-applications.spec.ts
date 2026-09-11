import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { GroupProps, PartnerApplicationProps } from "@/lib/types";
import { expect } from "@playwright/test";
import {
  ProgramApplicationRejectionReason,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import {
  apiError,
  expectNoOverlap,
  randomName,
  randomPartnerEmail,
} from "../../utils";
import { test } from "../fixtures";
import { createGroup, deleteGroup } from "../groups/helpers";
import { deletePartner } from "../partners/helpers";

type SeededApplication = {
  applicationId: string;
  partnerId: string;
  name: string;
  email: string;
  country: "US" | "GB";
  groupId: string;
};

const REJECTION_NOTE =
  "Your audience doesn't align with our target customers. Please reapply if that changes.";

function expectApplication(
  application: PartnerApplicationProps,
  expected: SeededApplication,
  status: ProgramEnrollmentStatus = "pending",
) {
  expect(application).toMatchObject({
    id: expected.applicationId,
    createdAt: expect.any(String),
    applicationFormData: [],
    partner: {
      id: expected.partnerId,
      name: expected.name,
      email: expected.email,
      country: expected.country,
      groupId: expected.groupId,
      status,
    },
  });
}

async function expectApplicationState(
  application: SeededApplication,
  {
    enrollmentStatus,
    rejectionReason,
  }: {
    enrollmentStatus: ProgramEnrollmentStatus;
    rejectionReason: ProgramApplicationRejectionReason | null;
  },
) {
  const enrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      applicationId: application.applicationId,
    },
    include: {
      application: true,
    },
  });

  expect(enrollment.status).toBe(enrollmentStatus);
  expect(enrollment.partnerId).toBe(application.partnerId);
  expect(enrollment.application?.rejectionReason ?? null).toBe(rejectionReason);
  expect(enrollment.application?.rejectionNote ?? null).toBe(
    rejectionReason ? REJECTION_NOTE : null,
  );
  expect(enrollment.application?.reviewedAt).toEqual(expect.any(Date));
}

test.describe("partner applications", () => {
  test.describe.configure({
    mode: "serial",
  });

  let programId: string;
  let extraGroup: GroupProps;
  let applications: SeededApplication[] = [];

  test.beforeAll(async ({ api, program }) => {
    programId = program.id;
    extraGroup = await createGroup(api);

    const now = Date.now();
    const rows: {
      name: string;
      email: string;
      country: "US" | "GB";
      groupId: string;
    }[] = [
      {
        name: randomName("application"),
        email: randomPartnerEmail(),
        country: "US",
        groupId: extraGroup.id,
      },
      {
        name: randomName("application"),
        email: randomPartnerEmail(),
        country: "US",
        groupId: extraGroup.id,
      },
      {
        name: randomName("application"),
        email: randomPartnerEmail(),
        country: "GB",
        groupId: extraGroup.id,
      },
      {
        name: randomName("application"),
        email: randomPartnerEmail(),
        country: "US",
        groupId: program.defaultGroupId,
      },
      {
        name: randomName("application"),
        email: randomPartnerEmail(),
        country: "GB",
        groupId: program.defaultGroupId,
      },
    ];

    for (const [i, row] of rows.entries()) {
      const partnerId = createId({ prefix: "pn_" });
      const applicationId = createId({ prefix: "pga_" });
      const createdAt = new Date(now - i * 1000);

      await prisma.partner.create({
        data: {
          id: partnerId,
          name: row.name,
          email: row.email,
          country: row.country,
        },
      });

      await prisma.programApplication.create({
        data: {
          id: applicationId,
          programId,
          groupId: row.groupId,
          name: row.name,
          email: row.email,
          country: row.country,
          formData: { fields: [] },
          createdAt,
        },
      });

      await prisma.programEnrollment.create({
        data: {
          id: createId({ prefix: "pge_" }),
          partnerId,
          programId,
          groupId: row.groupId,
          applicationId,
          status: "pending",
          createdAt,
        },
      });

      applications.push({
        applicationId,
        partnerId,
        name: row.name,
        email: row.email,
        country: row.country,
        groupId: row.groupId,
      });
    }
  });

  test.afterAll(async ({ api }) => {
    for (const application of applications) {
      await deletePartner(application.partnerId);
    }

    if (applications.length > 0) {
      await prisma.programApplication.deleteMany({
        where: {
          id: {
            in: applications.map((application) => application.applicationId),
          },
        },
      });
    }

    await deleteGroup(api, extraGroup?.id);
  });

  test("GET /partners/applications", async ({ api }) => {
    const { status, data } = await api.get<PartnerApplicationProps[]>(
      `/api/partners/applications?${new URLSearchParams({
        pageSize: "100",
      })}`,
    );

    expect(status).toEqual(200);

    const byId = new Map(
      data.map((application) => [application.id, application]),
    );

    for (const expected of applications) {
      const application = byId.get(expected.applicationId);
      expect(application).toBeDefined();
      expectApplication(application!, expected);
    }
  });

  test("GET /partners/applications – filters by country", async ({ api }) => {
    const expected = applications.filter(
      (application) =>
        application.groupId === extraGroup.id && application.country === "US",
    );

    const { status, data } = await api.get<PartnerApplicationProps[]>(
      `/api/partners/applications?${new URLSearchParams({
        pageSize: "100",
        country: "US",
        groupId: extraGroup.id,
      })}`,
    );

    expect(status).toEqual(200);
    expect(data.map((application) => application.id).sort()).toEqual(
      expected.map((application) => application.applicationId).sort(),
    );

    for (const expectedApplication of expected) {
      const application = data.find(
        (item) => item.id === expectedApplication.applicationId,
      );

      expect(application).toBeDefined();
      expectApplication(application!, expectedApplication);
    }
  });

  test("GET /partners/applications – filters by groupId", async ({ api }) => {
    const expected = applications.filter(
      (application) => application.groupId === extraGroup.id,
    );

    const { status, data } = await api.get<PartnerApplicationProps[]>(
      `/api/partners/applications?${new URLSearchParams({
        pageSize: "100",
        groupId: extraGroup.id,
      })}`,
    );

    expect(status).toEqual(200);
    expect(data.map((application) => application.id).sort()).toEqual(
      expected.map((application) => application.applicationId).sort(),
    );

    for (const expectedApplication of expected) {
      const application = data.find(
        (item) => item.id === expectedApplication.applicationId,
      );

      expect(application).toBeDefined();
      expectApplication(application!, expectedApplication);
    }
  });

  test("GET /partners/applications – respects pageSize", async ({ api }) => {
    const expected = applications.filter(
      (application) => application.groupId === extraGroup.id,
    );

    const page1 = await api.get<PartnerApplicationProps[]>(
      `/api/partners/applications?${new URLSearchParams({
        groupId: extraGroup.id,
        page: "1",
        pageSize: "1",
      })}`,
    );
    const page2 = await api.get<PartnerApplicationProps[]>(
      `/api/partners/applications?${new URLSearchParams({
        groupId: extraGroup.id,
        page: "2",
        pageSize: "1",
      })}`,
    );

    expect(page1.status).toEqual(200);
    expect(page2.status).toEqual(200);
    expect(page1.data).toHaveLength(1);
    expect(page2.data).toHaveLength(1);
    expect(page1.data[0]?.id).toBe(expected[0]?.applicationId);
    expect(page2.data[0]?.id).toBe(expected[1]?.applicationId);
    expectNoOverlap(page1.data, page2.data);
    expectApplication(page1.data[0]!, expected[0]!);
    expectApplication(page2.data[0]!, expected[1]!);
  });

  test("POST /partners/applications/approve", async ({ api }) => {
    const application = applications[0]!;

    const { status, data } = await api.post<{ partnerId: string }>(
      "/api/partners/applications/approve",
      {
        partnerId: application.partnerId,
        groupId: application.groupId,
      },
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({ partnerId: application.partnerId });
    await expectApplicationState(application, {
      enrollmentStatus: "approved",
      rejectionReason: null,
    });
  });

  test("POST /partners/applications/reject", async ({ api }) => {
    const application = applications[1]!;

    const { status, data } = await api.post<{ partnerId: string }>(
      "/api/partners/applications/reject",
      {
        partnerId: application.partnerId,
        rejectionReason: "other",
        rejectionNote: REJECTION_NOTE,
        reapplicationTimeframe: "standard",
      },
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({ partnerId: application.partnerId });
    await expectApplicationState(application, {
      enrollmentStatus: "rejected",
      rejectionReason: "other",
    });
  });

  test("POST /partners/applications/approve – already approved", async ({
    api,
  }) => {
    const application = applications[0]!;

    const response = await api.post("/api/partners/applications/approve", {
      partnerId: application.partnerId,
      groupId: application.groupId,
    });

    expect(response).toEqual(
      apiError({
        code: "bad_request",
        message:
          "This enrollment cannot be approved because it is already approved.",
      }),
    );

    await expectApplicationState(application, {
      enrollmentStatus: "approved",
      rejectionReason: null,
    });
  });

  test("POST /partners/applications/reject – already rejected", async ({
    api,
  }) => {
    const application = applications[1]!;

    const response = await api.post("/api/partners/applications/reject", {
      partnerId: application.partnerId,
      rejectionReason: "other",
      rejectionNote: REJECTION_NOTE,
      reapplicationTimeframe: "standard",
    });

    expect(response).toEqual(
      apiError({
        code: "bad_request",
        message:
          "This enrollment cannot be rejected because it is no longer pending.",
      }),
    );

    await expectApplicationState(application, {
      enrollmentStatus: "rejected",
      rejectionReason: "other",
    });
  });

  test("POST /partners/applications/approve – rejected partner", async ({
    api,
  }) => {
    const application = applications[1]!;

    const { status, data } = await api.post<{ partnerId: string }>(
      "/api/partners/applications/approve",
      {
        partnerId: application.partnerId,
        groupId: application.groupId,
      },
    );

    expect(status).toEqual(200);
    expect(data).toStrictEqual({ partnerId: application.partnerId });
    await expectApplicationState(application, {
      enrollmentStatus: "approved",
      rejectionReason: null,
    });
  });

  test("POST /partners/applications/reject – approved partner", async ({
    api,
  }) => {
    const application = applications[0]!;

    const response = await api.post("/api/partners/applications/reject", {
      partnerId: application.partnerId,
      rejectionReason: "other",
      rejectionNote: REJECTION_NOTE,
      reapplicationTimeframe: "standard",
    });

    expect(response).toEqual(
      apiError({
        code: "bad_request",
        message:
          "This enrollment cannot be rejected because it is no longer pending.",
      }),
    );

    await expectApplicationState(application, {
      enrollmentStatus: "approved",
      rejectionReason: null,
    });
  });
});
