import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK } from "../utils/resource";

const { domain, url } = E2E_LINK;

test("DELETE /links/{linkId}", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { http } = await h.init();

  const { data: link } = await http.post<Link>({
    path: "/links",
    body: {
      url,
      domain,
    },
  });

  const { status, data } = await http.delete({
    path: `/links/${link.id}`,
  });

  expect(status).toBe(200);
  expect(data).toStrictEqual({
    id: link.id,
  });

  // Re-fetch the link
  const { status: status2 } = await http.get({
    path: `/links/${link.id}`,
  });

  expect(status2).toBe(404);
});
