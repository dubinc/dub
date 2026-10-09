import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect, test } from "@playwright/test";
import { deletePartner } from "../api/partners/helpers";
import { TEST_WORKSPACE } from "../api/setup-test-workspace";
import { createPartnerUser, logIn } from "./helpers";

// The shared partner storage state is a new signup that has not finished
// onboarding, so these tests log in with a password instead
test.use({
  storageState: {
    cookies: [],
    origins: [],
  },
});

test.describe("Partner Programs page", () => {
  test("shows each status in its tab, in the grid and the table", async ({
    page,
  }) => {
    const email = `programs-tabs-${nanoid(8).toLowerCase()}@dub-internal-test.com`;
    const password = "Password123";
    let partnerId: string | undefined;
    let userId: string | undefined;

    try {
      const program = await prisma.program.findUniqueOrThrow({
        where: { slug: TEST_WORKSPACE.workspace.slug },
        select: { id: true, name: true, defaultGroupId: true },
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

      // the old Invitations page redirects to the Invitations tab
      await page.goto("/programs/invitations");
      await expect(page).toHaveURL("/programs?tab=invitations");
      await expect(
        page.getByRole("button", { name: "Accept invite" }),
      ).toBeVisible();

      // the Active tab is empty, and the Inactive tab is hidden
      await page.getByRole("button", { name: "Active" }).click();
      await expect(
        page.getByText("No programs", { exact: true }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Inactive" })).toHaveCount(
        0,
      );

      await prisma.programEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "approved" },
      });

      // the table view shows the program in the Active tab, with a footer
      await page.evaluate(() =>
        localStorage.setItem("partner-programs-view", JSON.stringify("table")),
      );
      await page.goto("/programs?tab=active");
      await expect(
        page.getByRole("cell", { name: program.name }),
      ).toBeVisible();
      await expect(
        page.getByText("Viewing 1-1 of 1 active program"),
      ).toBeVisible();

      // a search with no match shows the empty state
      await page.goto("/programs?tab=active&search=no-such-program");
      await expect(page.getByText("No programs found")).toBeVisible();
    } finally {
      if (userId) await prisma.user.delete({ where: { id: userId } });
      await deletePartner(partnerId);
    }
  });

  test("opens the first tab with programs when the URL has no tab", async ({
    page,
  }) => {
    const email = `programs-landing-${nanoid(8).toLowerCase()}@dub-internal-test.com`;
    const password = "Password123";
    let partnerId: string | undefined;
    let userId: string | undefined;

    try {
      const program = await prisma.program.findUniqueOrThrow({
        where: { slug: TEST_WORKSPACE.workspace.slug },
        select: { id: true, defaultGroupId: true },
      });

      ({ partnerId, userId } = await createPartnerUser({ email, password }));

      await prisma.programEnrollment.create({
        data: {
          id: createId({ prefix: "pge_" }),
          partnerId,
          programId: program.id,
          groupId: program.defaultGroupId,
          status: "invited",
        },
      });

      // a partner without an approved program lands on /programs
      await logIn(page, email, password);
      await expect(page).toHaveURL("/programs");

      await expect(
        page.getByRole("button", { name: "Invitations" }),
      ).toHaveAttribute("data-selected", "true");
      await expect(
        page.getByRole("button", { name: "Accept invite" }),
      ).toBeVisible();
    } finally {
      if (userId) await prisma.user.delete({ where: { id: userId } });
      await deletePartner(partnerId);
    }
  });
});
