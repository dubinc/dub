import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";

const { domain, url } = link;

test("GET /links/count", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { http } = await h.init();

  const [{ data: firstLink }] = await Promise.all([
    http.post<Link>({
      path: "/links",
      body: { url, domain },
    }),
  ]);

  const { status, data: count } = await http.get<Link[]>({
    path: "/links/count",
  });

  expect(status).toEqual(200);
  expect(count).toBeDefined();
  expect(count).greaterThanOrEqual(1);

  await h.deleteLink(firstLink.id);

  // TODO:
  // Assert actual value of count
});
