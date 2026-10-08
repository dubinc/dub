import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { GroupProps, PartnerApplicationProps } from "@/lib/types";
import { expect } from "@playwright/test";
import {
  ProgramApplicationRejectionReason,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import { apiError, randomName, randomPartnerEmail } from "../../utils";
import { createPartnerTag, deletePartnerTag } from "../campaigns/helpers";
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
  let defaultGroupId: string;
  let extraGroup: GroupProps;
  let applications: SeededApplication[] = [];
  const extraApplicationIds: string[] = [];

  test.beforeAll(async ({ api, program }) => {
    programId = program.id;
    defaultGroupId = program.defaultGroupId;
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
      {
        name: randomName("application"),
        email: randomPartnerEmail(),
        country: "US",
        groupId: program.defaultGroupId,
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

    if (applications.length > 0 || extraApplicationIds.length > 0) {
      await prisma.programApplication.deleteMany({
        where: {
          id: {
            in: [
              ...applications.map((application) => application.applicationId),
              ...extraApplicationIds,
            ],
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
          "This application cannot be approved because it is already approved.",
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
        code: "not_found",
        message: "No pending application found.",
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
        code: "not_found",
        message: "No pending application found.",
      }),
    );

    await expectApplicationState(application, {
      enrollmentStatus: "approved",
      rejectionReason: null,
    });
  });

  test("POST /program-applications/approve – partnerId only does not revive a rejected group application", async ({
    api,
  }) => {
    const application = applications[0]!;
    const rejectedApplicationId = createId({ prefix: "pga_" });
    extraApplicationIds.push(rejectedApplicationId);

    await prisma.programApplication.create({
      data: {
        id: rejectedApplicationId,
        programId,
        partnerId: application.partnerId,
        groupId: defaultGroupId,
        name: application.name,
        email: application.email,
        country: application.country,
        formData: { fields: [] },
        status: "rejected",
        reviewedAt: new Date(),
        createdAt: new Date(),
      },
    });

    const response = await api.post("/api/program-applications/approve", {
      partnerId: application.partnerId,
    });

    expect(response).toEqual(
      apiError({
        code: "bad_request",
        message:
          "This application cannot be approved because it is already approved.",
      }),
    );

    const enrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId: application.partnerId,
          programId,
        },
      },
    });

    expect(enrollment.status).toBe("approved");
    expect(enrollment.groupId).toBe(application.groupId);
    expect(enrollment.applicationId).toBe(application.applicationId);

    const rejectedApplication =
      await prisma.programApplication.findUniqueOrThrow({
        where: {
          id: rejectedApplicationId,
        },
      });

    expect(rejectedApplication.status).toBe("rejected");
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

  test("POST /program-applications/approve – invalid tagIds", async ({
    api,
  }) => {
    const application = applications[4]!;
    const tagId = "ptag_invalid";

    const response = await api.post("/api/program-applications/approve", {
      partnerId: application.partnerId,
      groupId: application.groupId,
      tagIds: [tagId],
    });

    expect(response).toEqual(
      apiError({
        code: "bad_request",
        message: `Invalid partner tag IDs detected: ${tagId}`,
      }),
    );

    const enrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        applicationId: application.applicationId,
      },
      include: {
        programPartnerTags: true,
        application: true,
      },
    });

    expect(enrollment.status).toBe("pending");
    expect(enrollment.application?.status).toBe("pending");
    expect(enrollment.programPartnerTags).toEqual([]);
  });

  test("POST /program-applications/approve – with tagIds", async ({ api }) => {
    const application = applications[4]!;
    let partnerTagId: string | undefined;

    try {
      const partnerTag = await createPartnerTag(programId);
      partnerTagId = partnerTag.id;

      const { status, data } = await api.post<{ partnerId: string }>(
        "/api/program-applications/approve",
        {
          partnerId: application.partnerId,
          groupId: application.groupId,
          tagIds: [partnerTag.id, partnerTag.id],
        },
      );

      expect(status).toEqual(200);
      expect(data).toStrictEqual({ partnerId: application.partnerId });
      await expectApplicationState(application, {
        enrollmentStatus: "approved",
        rejectionReason: null,
      });

      const tags = await prisma.programPartnerTag.findMany({
        where: {
          programId,
          partnerId: application.partnerId,
        },
      });

      expect(tags).toEqual([
        expect.objectContaining({
          partnerTagId: partnerTag.id,
        }),
      ]);
    } finally {
      await deletePartnerTag(partnerTagId);
    }
  });

  test("POST /program-applications/approve – invalid tagNames", async ({
    api,
  }) => {
    const application = applications[5]!;
    const tagName = "missing-partner-tag";

    const response = await api.post("/api/program-applications/approve", {
      partnerId: application.partnerId,
      groupId: application.groupId,
      tagNames: [tagName],
    });

    expect(response).toEqual(
      apiError({
        code: "bad_request",
        message: `Invalid partner tag names detected: ${tagName}`,
      }),
    );

    const enrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        applicationId: application.applicationId,
      },
      include: {
        programPartnerTags: true,
        application: true,
      },
    });

    expect(enrollment.status).toBe("pending");
    expect(enrollment.application?.status).toBe("pending");
    expect(enrollment.programPartnerTags).toEqual([]);
  });

  test("POST /program-applications/approve – with tagNames", async ({
    api,
  }) => {
    const application = applications[5]!;
    let partnerTagId: string | undefined;

    try {
      const partnerTag = await createPartnerTag(programId);
      partnerTagId = partnerTag.id;

      const { status, data } = await api.post<{ partnerId: string }>(
        "/api/program-applications/approve",
        {
          partnerId: application.partnerId,
          groupId: application.groupId,
          tagNames: [partnerTag.name, partnerTag.name],
        },
      );

      expect(status).toEqual(200);
      expect(data).toStrictEqual({ partnerId: application.partnerId });
      await expectApplicationState(application, {
        enrollmentStatus: "approved",
        rejectionReason: null,
      });

      const tags = await prisma.programPartnerTag.findMany({
        where: {
          programId,
          partnerId: application.partnerId,
        },
      });

      expect(tags).toEqual([
        expect.objectContaining({
          partnerTagId: partnerTag.id,
        }),
      ]);
    } finally {
      await deletePartnerTag(partnerTagId);
    }
  });

  test("POST /program-applications/approve – tagNames with a different case and a missing name", async ({
    api,
  }) => {
    const application = applications[6]!;
    let partnerTagId: string | undefined;
    const missingTagName = "missing-partner-tag";

    try {
      const partnerTag = await createPartnerTag(
        programId,
        `Tag-${randomName("case")}`,
      );
      partnerTagId = partnerTag.id;

      const response = await api.post("/api/program-applications/approve", {
        partnerId: application.partnerId,
        groupId: application.groupId,
        tagNames: [partnerTag.name.toLowerCase(), missingTagName],
      });

      expect(response).toEqual(
        apiError({
          code: "bad_request",
          message: `Invalid partner tag names detected: ${missingTagName}`,
        }),
      );

      const enrollment = await prisma.programEnrollment.findUniqueOrThrow({
        where: {
          applicationId: application.applicationId,
        },
        include: {
          programPartnerTags: true,
          application: true,
        },
      });

      expect(enrollment.status).toBe("pending");
      expect(enrollment.application?.status).toBe("pending");
      expect(enrollment.programPartnerTags).toEqual([]);
    } finally {
      await deletePartnerTag(partnerTagId);
    }
  });

  test("POST /program-applications/approve – tagNames are case-insensitive", async ({
    api,
  }) => {
    const application = applications[6]!;
    let partnerTagIds: string[] = [];

    try {
      const partnerTags = await Promise.all([
        createPartnerTag(programId, `Tag-${randomName("case")}`),
        createPartnerTag(programId, `Tag-${randomName("case")}`),
      ]);
      partnerTagIds = partnerTags.map((tag) => tag.id);

      const { status, data } = await api.post<{ partnerId: string }>(
        "/api/program-applications/approve",
        {
          partnerId: application.partnerId,
          groupId: application.groupId,
          tagNames: [
            partnerTags[0]!.name.toLowerCase(),
            partnerTags[0]!.name.toUpperCase(),
            partnerTags[1]!.name.toUpperCase(),
          ],
        },
      );

      expect(status).toEqual(200);
      expect(data).toStrictEqual({ partnerId: application.partnerId });
      await expectApplicationState(application, {
        enrollmentStatus: "approved",
        rejectionReason: null,
      });

      const tags = await prisma.programPartnerTag.findMany({
        where: {
          programId,
          partnerId: application.partnerId,
        },
        orderBy: {
          partnerTagId: "asc",
        },
      });

      expect(tags.map((tag) => tag.partnerTagId).sort()).toEqual(
        [...partnerTagIds].sort(),
      );
    } finally {
      for (const partnerTagId of partnerTagIds) {
        await deletePartnerTag(partnerTagId);
      }
    }
  });

  test("POST /program-applications/approve – tagIds take priority over tagNames", async ({
    api,
  }) => {
    const application = applications[7]!;
    let partnerTagId: string | undefined;

    try {
      const partnerTag = await createPartnerTag(programId);
      partnerTagId = partnerTag.id;

      const { status, data } = await api.post<{ partnerId: string }>(
        "/api/program-applications/approve",
        {
          partnerId: application.partnerId,
          groupId: application.groupId,
          tagIds: [partnerTag.id],
          tagNames: ["missing-partner-tag"],
        },
      );

      expect(status).toEqual(200);
      expect(data).toStrictEqual({ partnerId: application.partnerId });

      const tags = await prisma.programPartnerTag.findMany({
        where: {
          programId,
          partnerId: application.partnerId,
        },
      });

      expect(tags).toEqual([
        expect.objectContaining({
          partnerTagId: partnerTag.id,
        }),
      ]);
    } finally {
      await deletePartnerTag(partnerTagId);
    }
  });
});
