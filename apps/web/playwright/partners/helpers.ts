import { createId } from "@/lib/api/create-id";
import { testIds } from "@/lib/e2e/test-ids";
import { prisma } from "@/lib/prisma";
import { Page } from "@playwright/test";
import { hashSync } from "bcryptjs";

export async function logIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.getByTestId(testIds.auth.loginSubmit).click();
  await page.locator('input[type="password"]').fill(password);
  await page.getByTestId(testIds.auth.loginSubmit).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function createPartnerUser({
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
