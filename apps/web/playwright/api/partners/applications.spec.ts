import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { PartnerApplicationProps } from "@/lib/types";
import { PartnerApplicationSchema } from "@/lib/zod/schemas/program-application";
import { expect } from "@playwright/test";
import { apiError, randomName, randomPartnerEmail } from "../../utils";
import { test } from "../fixtures";
import {
  TEST_APPLICATION_FIELD_VALUES,
  TEST_APPLICATION_FORM,
} from "../setup-test-workspace";
import { deletePartner } from "./helpers";

type SeededApplication = {
  partnerId: string;
  applicationId: string;
};

async function seedPendingApplication(program: {
  id: string;
  defaultGroupId: string;
}): Promise<SeededApplication> {
  const partnerId = createId({ prefix: "pn_" });
  const applicationId = createId({ prefix: "pga_" });
  const enrollmentId = createId({ prefix: "pge_" });
  const email = randomPartnerEmail();
  const name = randomName("applicant");

  await prisma.partner.create({
    data: {
      id: partnerId,
      name,
      email,
      country: "US",
    },
  });

  await prisma.programApplication.create({
    data: {
      id: applicationId,
      programId: program.id,
      groupId: program.defaultGroupId,
      name,
      email,
      country: "US",
      formData: {
        fields: [
          {
            ...TEST_APPLICATION_FORM.fields[0],
            value: TEST_APPLICATION_FIELD_VALUES.website,
          },
          {
            ...TEST_APPLICATION_FORM.fields[1],
            value: TEST_APPLICATION_FIELD_VALUES.promote,
          },
          {
            ...TEST_APPLICATION_FORM.fields[2],
            value: "",
          },
        ],
      },
    },
  });

  await prisma.programEnrollment.create({
    data: {
      id: enrollmentId,
      partnerId,
      programId: program.id,
      groupId: program.defaultGroupId,
      applicationId,
      status: "pending",
    },
  });

  return { partnerId, applicationId };
}

async function deletePendingApplication({
  partnerId,
  applicationId,
}: Partial<SeededApplication>) {
  if (partnerId) {
    await prisma.programApplicationEvent.deleteMany({
      where: { partnerId },
    });
  }

  if (applicationId) {
    await prisma.programApplicationEvent.deleteMany({
      where: { programApplicationId: applicationId },
    });
  }

  await deletePartner(partnerId);

  if (applicationId) {
    await prisma.programApplication.deleteMany({
      where: { id: applicationId },
    });
  }
}

test("GET /partners/applications", async ({ api, program }) => {
  let seeded: SeededApplication | undefined;

  try {
    seeded = await seedPendingApplication(program);

    const { status, data } = await api.get<PartnerApplicationProps[]>(
      "/api/partners/applications",
    );

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);

    const application = data.find((item) => item.id === seeded!.applicationId);
    expect(application).toBeDefined();

    const parsed = PartnerApplicationSchema.parse(application);
    expect(parsed).toMatchObject({
      id: seeded.applicationId,
      partner: {
        id: seeded.partnerId,
        status: "pending",
        groupId: program.defaultGroupId,
        country: "US",
      },
      applicationFormData: [
        {
          label: TEST_APPLICATION_FORM.fields[0].label,
          value: TEST_APPLICATION_FIELD_VALUES.website,
        },
        {
          label: TEST_APPLICATION_FORM.fields[1].label,
          value: TEST_APPLICATION_FIELD_VALUES.promote,
        },
        {
          label: TEST_APPLICATION_FORM.fields[2].label,
          value: null,
        },
      ],
    });
  } finally {
    await deletePendingApplication(seeded ?? {});
  }
});

test("GET /partners/applications - pageSize pagination", async ({
  api,
  program,
}) => {
  let seeded: SeededApplication | undefined;

  try {
    seeded = await seedPendingApplication(program);

    const { status, data } = await api.get<PartnerApplicationProps[]>(
      "/api/partners/applications?page=1&pageSize=1",
    );

    expect(status).toEqual(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeLessThanOrEqual(1);
    data.forEach((application) => {
      PartnerApplicationSchema.parse(application);
    });
  } finally {
    await deletePendingApplication(seeded ?? {});
  }
});

test("GET /partners/applications/:id", async ({ api, program }) => {
  let seeded: SeededApplication | undefined;

  try {
    seeded = await seedPendingApplication(program);

    const { status, data } = await api.get<{
      id: string;
      programId: string;
      name: string;
      email: string;
    }>(`/api/partners/applications/${seeded.applicationId}`);

    expect(status).toEqual(200);
    expect(data).toMatchObject({
      id: seeded.applicationId,
      programId: program.id,
    });
  } finally {
    await deletePendingApplication(seeded ?? {});
  }
});

test("GET /partners/applications/:id - not found", async ({ api }) => {
  expect(
    await api.get("/api/partners/applications/pga_does_not_exist"),
  ).toEqual(
    apiError({
      code: "not_found",
      message: "Application pga_does_not_exist not found.",
    }),
  );
});
