import { Link } from "@dub/prisma/client";
import { expect, onTestFinished, test } from "vitest";
import { env } from "../utils/env";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER_ID, E2E_PROGRAM } from "../utils/resource";
import { expectedLink, LinkSchema } from "../utils/schema";

test.skipIf(env.CI)("POST /api/partners/links", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  onTestFinished(async () => {
    await h.deleteLink(link.id);
  });

  const { status, data: link } = await http.post<Link>({
    path: "/partners/links",
    body: {
      programId: E2E_PROGRAM.id,
      partnerId: E2E_PARTNER_ID,
      tenantId: randomId(),
    },
  });

  expect(status).toEqual(200);
  expect(LinkSchema.strict().parse(link)).toBeTruthy();
  expect(link).toStrictEqual({
    ...expectedLink,
  });
});
