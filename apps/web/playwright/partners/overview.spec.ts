import { createId } from "@/lib/api/create-id";
import { testIds } from "@/lib/e2e/test-ids";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect, test } from "@playwright/test";
import { deletePartner } from "../api/partners/helpers";
import { TEST_WORKSPACE } from "../api/setup-test-workspace";
import { env } from "../env";
import { createPartnerUser, logIn } from "./helpers";

// The shared partner storage state is a new signup that has not finished
// onboarding, so these tests log in with a password instead
test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
});

const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

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

  test("stacks Recent payouts after Recent earnings on mobile, and next to the chart on desktop", async ({
    page,
  }) => {
    await logIn(page, env.E2E_PARTNER_EMAIL, env.E2E_PARTNER_PASSWORD);
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto("/overview");

    const { earnings, topPrograms, recentEarnings, recentPayouts, topLinks } =
      testIds.partnerOverview;

    const getBox = async (testId: string) => {
      const card = page.getByTestId(testId);
      await expect(card).toBeVisible();
      return (await card.boundingBox())!;
    };

    const mobileTops: number[] = [];
    for (const testId of [
      earnings,
      topPrograms,
      recentEarnings,
      recentPayouts,
      topLinks,
    ]) {
      mobileTops.push((await getBox(testId)).y);
    }
    expect(mobileTops).toEqual([...mobileTops].sort((a, b) => a - b));

    await page.setViewportSize(DESKTOP_VIEWPORT);
    const earningsBox = await getBox(earnings);
    const payoutsBox = await getBox(recentPayouts);
    expect(payoutsBox.y).toBe(earningsBox.y);
    expect(payoutsBox.x).toBeGreaterThan(earningsBox.x);
  });

  test("always shows Tasks on desktop, and on mobile only when an action is needed", async ({
    page,
  }) => {
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
      const invitationsTask = tasks.getByRole("link", {
        name: /Review new invitations/,
      });
      const messagesTask = tasks.getByRole("link", {
        name: /Respond to programs/,
      });

      await expect(tasks).toBeVisible();
      await expect(invitationsTask).toHaveText(/^Review new invitations\s*1$/);
      await expect(messagesTask).toHaveText(/^Respond to programs\s*0$/);

      await page.setViewportSize(MOBILE_VIEWPORT);
      await expect(tasks).toBeVisible();

      // on mobile, Tasks comes after Recent payouts and before Top links
      const getTop = async (testId: string) =>
        (await page.getByTestId(testId).boundingBox())!.y;
      const tasksTop = (await tasks.boundingBox())!.y;
      expect(tasksTop).toBeGreaterThan(
        await getTop(testIds.partnerOverview.recentPayouts),
      );
      expect(tasksTop).toBeLessThan(
        await getTop(testIds.partnerOverview.topLinks),
      );

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

      await page.setViewportSize(DESKTOP_VIEWPORT);
      await expect(tasks).toBeVisible();
      await expect(invitationsTask).toHaveText(/^Review new invitations\s*0$/);
      await expect(messagesTask).toHaveText(/^Respond to programs\s*0$/);
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
