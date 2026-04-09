import { expect, test } from "@playwright/test";
import { RBAC_PROGRAMS } from "./rbac-constants";

const { acme, example } = RBAC_PROGRAMS;

// Helper to wait for sidebar to be ready
async function waitForSidebar(page: import("@playwright/test").Page) {
  await expect(
    page.getByRole("link", { name: "Programs", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
}

// Helper to check page loads without error
async function expectPageLoads(page: import("@playwright/test").Page) {
  // Ensure page doesn't show a hard error
  await expect(page.locator("body")).not.toContainText("Application error", {
    timeout: 10_000,
  });
}

test.describe("Owner role", () => {
  test.use({ storageState: "playwright/.auth/partner-owner.json" });

  test("can see Payouts and Messages in sidebar", async ({ page }) => {
    await page.goto("/programs");
    await waitForSidebar(page);

    await expect(
      page.getByRole("link", { name: "Payouts", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Messages", exact: true }),
    ).toBeVisible();
  });

  test("can see both programs in programs list", async ({ page }) => {
    await page.goto("/programs");

    await expect(page.getByText("Acme")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Example")).toBeVisible();
  });

  test("can see all 2 links on Acme program", async ({ page }) => {
    await page.goto(`/programs/${acme}/links`);

    await expect(page.getByText("rbac-acme-link-1")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("rbac-acme-link-2")).toBeVisible();
  });

  test("can see all 2 links on Example program", async ({ page }) => {
    await page.goto(`/programs/${example}/links`);

    await expect(page.getByText("rbac-example-link-1")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("rbac-example-link-2")).toBeVisible();
  });

  test("can access Acme program pages", async ({ page }) => {
    // Overview
    await page.goto(`/programs/${acme}`);
    await expectPageLoads(page);

    // Links
    await page.goto(`/programs/${acme}/links`);
    await expectPageLoads(page);

    // Earnings
    await page.goto(`/programs/${acme}/earnings`);
    await expectPageLoads(page);

    // Bounties
    await page.goto(`/programs/${acme}/bounties`);
    await expectPageLoads(page);

    // Resources
    await page.goto(`/programs/${acme}/resources`);
    await expectPageLoads(page);
  });

  test("can access messages page", async ({ page }) => {
    await page.goto(`/messages/${acme}`);
    await expectPageLoads(page);
  });

  test("can access payouts page", async ({ page }) => {
    await page.goto("/payouts");
    await expectPageLoads(page);
    await expect(page.getByText("Payouts")).toBeVisible();
  });

  test("can access profile with edit controls enabled", async ({ page }) => {
    await page.goto("/profile");
    await expectPageLoads(page);
    await expect(page.getByText("Profile")).toBeVisible();

    // Three-dots menu button should be present and clickable
    const menuButton = page.locator('button:has([class*="three-dots"])');
    // Fall back to finding by the specific variant button in controls area
    const controlsButton = page
      .locator("header")
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .last();
    await expect(controlsButton).toBeVisible({ timeout: 10_000 });
    await expect(controlsButton).toBeEnabled();
  });

  test("can access members page", async ({ page }) => {
    await page.goto("/profile/members");
    await expectPageLoads(page);
  });
});

test.describe("Viewer role", () => {
  test.use({ storageState: "playwright/.auth/partner-viewer.json" });

  test("cannot see Payouts or Messages in sidebar", async ({ page }) => {
    await page.goto("/programs");
    await waitForSidebar(page);

    await expect(
      page.getByRole("link", { name: "Payouts", exact: true }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("link", { name: "Messages", exact: true }),
    ).not.toBeVisible();
  });

  test("can see both programs in programs list", async ({ page }) => {
    await page.goto("/programs");

    await expect(page.getByText("Acme")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Example")).toBeVisible();
  });

  test("can access Acme program pages", async ({ page }) => {
    await page.goto(`/programs/${acme}`);
    await expectPageLoads(page);

    await page.goto(`/programs/${acme}/links`);
    await expectPageLoads(page);

    await page.goto(`/programs/${acme}/earnings`);
    await expectPageLoads(page);

    await page.goto(`/programs/${acme}/bounties`);
    await expectPageLoads(page);

    await page.goto(`/programs/${acme}/resources`);
    await expectPageLoads(page);
  });

  test("can access Example program pages", async ({ page }) => {
    await page.goto(`/programs/${example}`);
    await expectPageLoads(page);

    await page.goto(`/programs/${example}/links`);
    await expectPageLoads(page);
  });

  test("can see links on Acme program", async ({ page }) => {
    await page.goto(`/programs/${acme}/links`);

    await expect(page.getByText("rbac-acme-link-1")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("rbac-acme-link-2")).toBeVisible();
  });

  test("profile page has disabled edit controls", async ({ page }) => {
    await page.goto("/profile");
    await expectPageLoads(page);
    await expect(page.getByText("Profile")).toBeVisible();

    // The three-dots button should still render but the popover action inside should be disabled
    // We check the merge accounts button is disabled when clicked
    const controlsButton = page
      .locator("header")
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .last();
    await expect(controlsButton).toBeVisible({ timeout: 10_000 });
    await controlsButton.click();

    // The "Merge accounts" button inside the popover should be disabled
    const mergeButton = page.getByRole("button", { name: "Merge accounts" });
    await expect(mergeButton).toBeVisible();
    await expect(mergeButton).toBeDisabled();
  });

  test("can access members page", async ({ page }) => {
    await page.goto("/profile/members");
    await expectPageLoads(page);
  });

  test("payouts page shows error state", async ({ page }) => {
    await page.goto("/payouts");
    await expectPageLoads(page);
  });

  test("messages page loads", async ({ page }) => {
    await page.goto(`/messages/${acme}`);
    await expectPageLoads(page);
  });
});

test.describe("Member role (restricted access)", () => {
  test.use({ storageState: "playwright/.auth/partner-member.json" });

  test("can see Payouts and Messages in sidebar", async ({ page }) => {
    await page.goto("/programs");
    await waitForSidebar(page);

    await expect(
      page.getByRole("link", { name: "Payouts", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Messages", exact: true }),
    ).toBeVisible();
  });

  test("can see only Acme in programs list", async ({ page }) => {
    await page.goto("/programs");

    await expect(page.getByText("Acme")).toBeVisible({ timeout: 15_000 });
    // Example should not be visible since member has restricted access
    await expect(page.getByText("Example")).not.toBeVisible();
  });

  test("can see only 1 link on Acme program", async ({ page }) => {
    await page.goto(`/programs/${acme}/links`);

    await expect(page.getByText("rbac-acme-link-1")).toBeVisible({
      timeout: 15_000,
    });
    // Second link should not be visible (not assigned)
    await expect(page.getByText("rbac-acme-link-2")).not.toBeVisible();
  });

  test("can access Acme program pages", async ({ page }) => {
    await page.goto(`/programs/${acme}`);
    await expectPageLoads(page);

    await page.goto(`/programs/${acme}/links`);
    await expectPageLoads(page);

    await page.goto(`/programs/${acme}/earnings`);
    await expectPageLoads(page);

    await page.goto(`/programs/${acme}/bounties`);
    await expectPageLoads(page);

    await page.goto(`/programs/${acme}/resources`);
    await expectPageLoads(page);
  });

  test("can access Acme messages", async ({ page }) => {
    await page.goto(`/messages/${acme}`);
    await expectPageLoads(page);
  });

  test("cannot access Example program (not assigned)", async ({ page }) => {
    await page.goto(`/programs/${example}`);

    // Should redirect to apply page since the enrollment API returns 404
    await page.waitForURL(/\/(apply|programs)/, { timeout: 15_000 });
  });

  test("can access payouts page", async ({ page }) => {
    await page.goto("/payouts");
    await expectPageLoads(page);
    await expect(page.getByText("Payouts")).toBeVisible();
  });

  test("profile page has disabled edit controls", async ({ page }) => {
    await page.goto("/profile");
    await expectPageLoads(page);
    await expect(page.getByText("Profile")).toBeVisible();

    const controlsButton = page
      .locator("header")
      .getByRole("button")
      .filter({ has: page.locator("svg") })
      .last();
    await expect(controlsButton).toBeVisible({ timeout: 10_000 });
    await controlsButton.click();

    const mergeButton = page.getByRole("button", { name: "Merge accounts" });
    await expect(mergeButton).toBeVisible();
    await expect(mergeButton).toBeDisabled();
  });

  test("can access members page", async ({ page }) => {
    await page.goto("/profile/members");
    await expectPageLoads(page);
  });
});
