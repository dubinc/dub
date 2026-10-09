import { createId } from "@/lib/api/create-id";
import { testIds } from "@/lib/e2e/test-ids";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect, Page, test } from "@playwright/test";
import { hashSync } from "bcryptjs";
import { deletePartner } from "../api/partners/helpers";
import { TEST_WORKSPACE } from "../api/setup-test-workspace";
import { env } from "../env";

// The shared partner storage state is a new signup that has not finished
// onboarding, so these tests log in with a password instead
test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
});

async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.getByTestId(testIds.auth.loginSubmit).click();
  await page.locator('input[type="password"]').fill(password);
  await page.getByTestId(testIds.auth.loginSubmit).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

async function createPartnerUser({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const partner = await prisma.partner.create({
    data: {
      id: createId({ prefix: "pn_" }),
      name: "Overview Test Partner",
      email,
      country: "US",
    },
  });

  const user = await prisma.user.create({
    data: {
      id: createId({ prefix: "user_" }),
      email,
      emailVerified: new Date(),
      passwordHash: hashSync(password, 10),
      defaultPartnerId: partner.id,
      partners: {
        create: {
          partnerId: partner.id,
          role: "owner",
        },
      },
    },
  });

  return { partnerId: partner.id, userId: user.id };
}

test.describe("Partner All programs Overview", () => {
  test("renders every Overview card", async ({ page }) => {
    await logIn(page, env.E2E_PARTNER_EMAIL, env.E2E_PARTNER_PASSWORD);
    await page.goto("/overview");

    // Tasks shows only when an action is needed, see the next test
    const { tasks: _, ...cards } = testIds.partnerOverview;

    for (const testId of Object.values(cards)) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
  });

  test("shows Tasks only when an action is needed", async ({ page }) => {
    const email = `overview-tasks-${nanoid(8).toLowerCase()}@dub-internal-test.com`;
    const password = "Password123";
    let partnerId: string | undefined;
    let userId: string | undefined;

    try {
      const program = await prisma.program.findUniqueOrThrow({
        where: { slug: TEST_WORKSPACE.workspace.slug },
        select: { id: true, defaultGroupId: true },
      });

      ({ partnerId, userId } = await createPartnerUser({ email, password }));

      const enrollment = await prisma.programEnrollment.create({
        data: {
          id: createId({ prefix: "pge_" }),
          partnerId,
          programId: program.id,
          groupId: program.defaultGroupId,
          status: "invited",
        },
      });

      await logIn(page, email, password);
      await page.goto("/overview");

      const tasks = page.getByTestId(testIds.partnerOverview.tasks);
      await expect(tasks).toBeVisible();
      await expect(tasks.getByText("Review new invitations")).toBeVisible();
      await expect(tasks.getByText("Respond to programs")).toHaveCount(0);

      await prisma.programEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "approved" },
      });

      // the card is also hidden while the counts load, so wait for them
      const countsLoaded = Promise.all([
        page.waitForResponse((res) =>
          res
            .url()
            .includes("/api/partner-profile/programs/count?status=invited"),
        ),
        page.waitForResponse((res) =>
          res.url().includes("/api/partner-profile/messages/count?unread=true"),
        ),
      ]);
      await page.reload();
      await countsLoaded;

      await expect(
        page.getByTestId(testIds.partnerOverview.recentPayouts),
      ).toBeVisible();
      await expect(tasks).toHaveCount(0);
    } finally {
      if (userId) await prisma.user.delete({ where: { id: userId } });
      await deletePartner(partnerId);
    }
  });

  test("lands on /programs without an approved program, and on /overview with one", async ({
    page,
  }) => {
    const email = `overview-landing-${nanoid(8).toLowerCase()}@dub-internal-test.com`;
    const password = "Password123";
    let partnerId: string | undefined;
    let userId: string | undefined;

    try {
      const program = await prisma.program.findUniqueOrThrow({
        where: { slug: TEST_WORKSPACE.workspace.slug },
        select: { id: true, defaultGroupId: true },
      });

      ({ partnerId, userId } = await createPartnerUser({ email, password }));

      await logIn(page, email, password);
      await expect(page).toHaveURL("/programs");

      await prisma.programEnrollment.create({
        data: {
          id: createId({ prefix: "pge_" }),
          partnerId,
          programId: program.id,
          groupId: program.defaultGroupId,
          status: "approved",
        },
      });

      await page.goto("/");
      await expect(page).toHaveURL("/overview");
    } finally {
      if (userId) await prisma.user.delete({ where: { id: userId } });
      await deletePartner(partnerId);
    }
  });
});
