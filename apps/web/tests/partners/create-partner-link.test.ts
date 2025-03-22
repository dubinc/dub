import { Link } from "@dub/prisma/client";
import { expect, onTestFinished, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER, E2E_PROGRAM } from "../utils/resource";
import { LinkSchema } from "../utils/schema";
import { partnerLink } from "./resource";

test("POST /api/partners/links", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  onTestFinished(async () => {
    await h.deleteLink(link.id);
  });

  const { status, data: link } = await http.post<Link>({
    path: "/partners/links",
    body: {
      programId: E2E_PROGRAM.id,
      partnerId: E2E_PARTNER.id,
    },
  });

  expect(status).toEqual(201);
  expect(LinkSchema.strict().parse(link)).toBeTruthy();
  expect(link).toStrictEqual(partnerLink);
});
