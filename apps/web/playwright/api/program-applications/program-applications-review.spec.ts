import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { GroupProps, PartnerApplicationProps } from "@/lib/types";
import { expect } from "@playwright/test";
import {
  ProgramApplicationRejectionReason,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import { apiError, randomName, randomPartnerEmail } from "../../utils";
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

test.describe("program application reviews", () => {
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
          partnerId,
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

  test("GET /partners/applications – legacy alias of GET /program-applications", async ({
    api,
  }) => {
    const expected = applications.filter(
      (application) => application.groupId === extraGroup.id,
    );

    const { status, data } = await api.get<PartnerApplicationProps[]>(
      `/api/partners/applications?${new URLSearchParams({
        groupId: extraGroup.id,
      })}`,
    );

    expect(status).toEqual(200);
    expect(data.map((application) => application.id)).toEqual(
      expected.map((application) => application.applicationId),
    );

    for (const [i, application] of data.entries()) {
      expectApplication(application, expected[i]!);
    }
  });

  test("POST /program-applications/approve", async ({ api }) => {
    const application = applications[0]!;

    const { status, data } = await api.post<{ partnerId: string }>(
      "/api/program-applications/approve",
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

  test("POST /program-applications/reject", async ({ api }) => {
    const application = applications[1]!;

    const { status, data } = await api.post<{ partnerId: string }>(
      "/api/program-applications/reject",
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

  test("POST /program-applications/approve – already approved", async ({
    api,
  }) => {
    const application = applications[0]!;

    const response = await api.post("/api/program-applications/approve", {
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

  test("POST /program-applications/reject – already rejected", async ({
    api,
  }) => {
    const application = applications[1]!;

    const response = await api.post("/api/program-applications/reject", {
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

  test("POST /program-applications/approve – rejected partner", async ({
    api,
  }) => {
    const application = applications[1]!;

    const { status, data } = await api.post<{ partnerId: string }>(
      "/api/program-applications/approve",
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

  test("POST /program-applications/reject – approved partner", async ({
    api,
  }) => {
    const application = applications[0]!;

    const response = await api.post("/api/program-applications/reject", {
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

  test("POST /partners/applications/approve – legacy alias of POST /program-applications/approve", async ({
    api,
  }) => {
    const application = applications[2]!;

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

  test("POST /partners/applications/reject – legacy alias of POST /program-applications/reject", async ({
    api,
  }) => {
    const application = applications[3]!;

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
});
