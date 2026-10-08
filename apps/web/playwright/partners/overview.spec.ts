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

test.describe("Partner All programs Overview", () => {
  test("renders every Overview card", async ({ page }) => {
    await logIn(page, env.E2E_PARTNER_EMAIL, env.E2E_PARTNER_PASSWORD);
    await page.goto("/overview");

    for (const testId of Object.values(testIds.partnerOverview)) {
      await expect(page.getByTestId(testId)).toBeVisible();
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

      const partner = await prisma.partner.create({
        data: {
          id: createId({ prefix: "pn_" }),
          name: "Overview Landing Partner",
          email,
          country: "US",
        },
      });
      partnerId = partner.id;

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
      userId = user.id;

      await logIn(page, email, password);
      await expect(page).toHaveURL("/programs");

      await prisma.programEnrollment.create({
        data: {
          id: createId({ prefix: "pge_" }),
          partnerId: partner.id,
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
