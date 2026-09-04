import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { PartnerApplicationProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import {
  expect,
  test,
  type Page,
  type PlaywrightWorkerArgs,
} from "@playwright/test";
import { hashSync } from "bcryptjs";
import { PLAYWRIGHT_API_BASE } from "../api/constants";
import {
  createApiClient,
  loadApiAuth,
  type ApiClient,
} from "../api/fixtures";
import {
  TEST_APPLICATION_FIELD_VALUES,
  TEST_APPLICATION_FORM,
  TEST_WORKSPACE,
} from "../api/setup-test-workspace";
import { randomName, randomPartnerEmail } from "../utils";

const PROGRAM_SLUG = TEST_WORKSPACE.workspace.slug;
const PROGRAM_NAME = TEST_WORKSPACE.workspace.name;
const APPLY_PARTNER = {
  email: "playwright-apply@dub-internal-test.com",
  password: "Password123",
  name: "Playwright Apply",
};

const expectedPendingApplication = {
  partner: {
    email: APPLY_PARTNER.email,
    status: "pending",
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
};

test.describe.configure({ mode: "serial" });
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Public application form", () => {
  test("apply page renders required fields", async ({ page }) => {
    await page.goto(`/${PROGRAM_SLUG}/apply`);

    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(
      page.getByLabel(TEST_APPLICATION_FORM.fields[0].label),
    ).toBeVisible();
    await expect(
      page.getByLabel(TEST_APPLICATION_FORM.fields[1].label),
    ).toBeVisible();
    await expect(
      page.getByLabel(TEST_APPLICATION_FORM.fields[2].label),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("empty submit stays on the apply page", async ({ page }) => {
    await page.goto(`/${PROGRAM_SLUG}/apply`);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page).toHaveURL(new RegExp(`/${PROGRAM_SLUG}/apply`));
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  });

  test("submit creates an application and redirects to success", async ({
    page,
    playwright,
  }) => {
    const name = randomName("applicant");
    const email = randomPartnerEmail();
    const api = await createWorkspaceApi(playwright);

    try {
      await page.goto(`/${PROGRAM_SLUG}/apply`);
      await page.locator('input[name="name"]').fill(name);
      await page.locator('input[name="email"]').fill(email);
      await fillRequiredFields(page);
      await page.getByRole("button", { name: "Continue" }).click();

      await page.waitForURL(
        new RegExp(
          `/${PROGRAM_SLUG}/${DEFAULT_PARTNER_GROUP.slug}/apply/success\\?applicationId=pga_`,
        ),
      );
      await expect(
        page.getByRole("heading", { name: "Finish your application" }),
      ).toBeVisible();

      const applicationId = new URL(page.url()).searchParams.get(
        "applicationId",
      );
      expect(applicationId).toMatch(/^pga_/);

      const { status, data } = await api.get<{
        id: string;
        name: string;
        email: string;
      }>(`/api/partners/applications/${applicationId}`);

      expect(status).toEqual(200);
      expect(data).toMatchObject({
        id: applicationId,
        name,
        email,
      });
    } finally {
      await cleanupApplication({ email });
      await api.dispose();
    }
  });
});

test.describe("Marketplace application form", () => {
  test("submit application from the marketplace sheet", async ({
    page,
    playwright,
  }) => {
    const partner = await ensureApprovedApplyPartner();
    const api = await createWorkspaceApi(playwright);

    try {
      await cleanupApplication({ partnerId: partner.id });
      await loginAsApplyPartner(page);

      await page.goto(`/marketplace/${PROGRAM_SLUG}`);
      await expect(
        page.getByRole("heading", { name: PROGRAM_NAME, exact: true }),
      ).toBeVisible();
      // Marketplace CTA accessible name includes the "A" shortcut.
      await page.getByRole("button", { name: /^Apply( A)?$/ }).click();

      await expect(
        page.getByRole("button", { name: "Submit application" }),
      ).toBeVisible();
      await expect(page.locator('input[name="name"]')).toHaveCount(0);
      await expect(page.locator('input[name="email"]')).toHaveCount(0);

      await fillRequiredFields(page);
      await page.getByRole("button", { name: "Submit application" }).click();
      await expect(page.getByText("Application submitted")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Back to marketplace" }),
      ).toBeVisible();

      const { status, data } = await api.get<PartnerApplicationProps[]>(
        "/api/partners/applications?pageSize=100",
      );
      expect(status).toEqual(200);
      expect(
        data.find(
          (application) =>
            application.partner.email === APPLY_PARTNER.email &&
            application.partner.status === "pending",
        ),
      ).toMatchObject(expectedPendingApplication);
    } finally {
      await cleanupApplication({ partnerId: partner.id });
      await api.dispose();
    }
  });
});

test.describe("In-app program page application form", () => {
  test("submit application from the program page sheet", async ({
    page,
    playwright,
  }) => {
    const partner = await ensureApprovedApplyPartner();
    const api = await createWorkspaceApi(playwright);

    try {
      await cleanupApplication({ partnerId: partner.id });
      await loginAsApplyPartner(page);

      await page.goto(`/programs/${PROGRAM_SLUG}/apply`);
      await expect(
        page.getByRole("heading", {
          name: `Join the ${PROGRAM_NAME} affiliate program`,
        }),
      ).toBeVisible();

      await page.getByRole("button", { name: /^Apply( A)?$/ }).click();
      await expect(
        page.getByRole("button", { name: "Submit application" }),
      ).toBeVisible();

      await fillRequiredFields(page);
      await page.getByRole("button", { name: "Submit application" }).click();
      await expect(page.getByText("Application submitted")).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Back to programs" }),
      ).toBeVisible();

      const { status, data } = await api.get<PartnerApplicationProps[]>(
        "/api/partners/applications?pageSize=100",
      );
      expect(status).toEqual(200);
      expect(
        data.find(
          (application) =>
            application.partner.email === APPLY_PARTNER.email &&
            application.partner.status === "pending",
        ),
      ).toMatchObject(expectedPendingApplication);
    } finally {
      await cleanupApplication({ partnerId: partner.id });
      await api.dispose();
    }
  });
});

async function fillRequiredFields(page: Page) {
  await page
    .getByLabel(TEST_APPLICATION_FORM.fields[0].label)
    .fill(TEST_APPLICATION_FIELD_VALUES.website);
  await page
    .getByLabel(TEST_APPLICATION_FORM.fields[1].label)
    .fill(TEST_APPLICATION_FIELD_VALUES.promote);
}

async function createWorkspaceApi(
  playwright: PlaywrightWorkerArgs["playwright"],
) {
  const { token } = loadApiAuth();
  const context = await playwright.request.newContext({
    baseURL: PLAYWRIGHT_API_BASE,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  return Object.assign(createApiClient(context), {
    dispose: () => context.dispose(),
  });
}

async function loginAsApplyPartner(page: Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(APPLY_PARTNER.email);
  await page.getByRole("button", { name: "Log in with email" }).click();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await page.locator('input[type="password"]').fill(APPLY_PARTNER.password);
  await page.getByRole("button", { name: "Log in with password" }).click();
  await page.waitForURL((url) =>
    /^\/(programs|onboarding|marketplace)/.test(new URL(url).pathname),
  );
}

async function ensureApprovedApplyPartner() {
  const passwordHash = hashSync(APPLY_PARTNER.password, 10);

  const user = await prisma.user.upsert({
    where: { email: APPLY_PARTNER.email },
    update: {
      name: APPLY_PARTNER.name,
      passwordHash,
      emailVerified: new Date(),
    },
    create: {
      id: createId({ prefix: "user_" }),
      email: APPLY_PARTNER.email,
      name: APPLY_PARTNER.name,
      passwordHash,
      emailVerified: new Date(),
    },
  });

  let partner = await prisma.partner.findUnique({
    where: { email: APPLY_PARTNER.email },
  });

  if (!partner) {
    partner = await prisma.partner.create({
      data: {
        id: createId({ prefix: "pn_" }),
        name: APPLY_PARTNER.name,
        email: APPLY_PARTNER.email,
        country: "US",
        users: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
    });
  }

  await prisma.partnerUser.upsert({
    where: {
      userId_partnerId: {
        userId: user.id,
        partnerId: partner.id,
      },
    },
    create: {
      userId: user.id,
      partnerId: partner.id,
      role: "owner",
    },
    update: {},
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultPartnerId: partner.id },
  });

  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      country: "US",
      image: `https://api.dicebear.com/9.x/micah/png?seed=${partner.id}`,
      description:
        "Playwright partner used for program application e2e tests.",
      monthlyTraffic: "ZeroToOneThousand",
      networkStatus: "approved",
    },
  });

  await Promise.all([
    prisma.partnerPlatform.upsert({
      where: {
        partnerId_type: { partnerId: partner.id, type: "website" },
      },
      create: {
        partnerId: partner.id,
        type: "website",
        identifier: "https://example.com",
        verifiedAt: new Date(),
      },
      update: { verifiedAt: new Date() },
    }),
    prisma.partnerPlatform.upsert({
      where: {
        partnerId_type: { partnerId: partner.id, type: "youtube" },
      },
      create: {
        partnerId: partner.id,
        type: "youtube",
        identifier: "playwright",
        verifiedAt: new Date(),
      },
      update: { verifiedAt: new Date() },
    }),
    prisma.partnerPreferredEarningStructure.createMany({
      data: [
        {
          partnerId: partner.id,
          preferredEarningStructure: "Revenue_Share",
        },
      ],
      skipDuplicates: true,
    }),
    prisma.partnerSalesChannel.createMany({
      data: [
        { partnerId: partner.id, salesChannel: "Blogs" },
      ],
      skipDuplicates: true,
    }),
  ]);

  return partner;
}

async function cleanupApplication({
  email,
  partnerId,
}: {
  email?: string;
  partnerId?: string;
}) {
  const program = await prisma.program.findUnique({
    where: { slug: PROGRAM_SLUG },
    select: { id: true },
  });

  if (!program) {
    return;
  }

  const applications = await prisma.programApplication.findMany({
    where: {
      programId: program.id,
      OR: [
        ...(email ? [{ email }] : []),
        ...(partnerId ? [{ enrollment: { is: { partnerId } } }] : []),
      ],
    },
    select: { id: true },
  });

  if (partnerId) {
    await prisma.programApplicationEvent.deleteMany({
      where: { partnerId, programId: program.id },
    });
    await prisma.programEnrollment.deleteMany({
      where: { partnerId, programId: program.id },
    });
  }

  if (applications.length > 0) {
    const applicationIds = applications.map((application) => application.id);
    await prisma.programApplicationEvent.deleteMany({
      where: { programApplicationId: { in: applicationIds } },
    });
    await prisma.programApplication.deleteMany({
      where: { id: { in: applicationIds } },
    });
  }
}
