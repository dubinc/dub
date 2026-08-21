import { Domain, Link } from "@prisma/client";
import { expect, onTestFinished, test } from "vitest";
import { randomId } from "../utils/helpers";
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

test("DELETE /links/{linkId} - cannot delete root link", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http } = await h.init();
  const slug = `${randomId()}.dub-internal-test.com`;

  await http.post<Domain>({
    path: "/domains",
    query: { workspaceId: workspace.id },
    body: { slug },
  });

  onTestFinished(async () => {
    await h.deleteDomain(slug);
  });

  const { data: rootLink } = await http.get<Link>({
    path: "/links/info",
    query: { workspaceId: workspace.id, domain: slug },
  });

  const { status, data } = await http.delete({
    path: `/links/${rootLink.id}`,
  });

  expect(status).toBe(403);
  expect(data).toStrictEqual({
    error: {
      code: "forbidden",
      message:
        "You can't delete a custom domain link. You can delete the domain instead.",
      doc_url: "https://dub.co/docs/api-reference/errors#forbidden",
    },
  });

  const { status: status2 } = await http.get({
    path: `/links/${rootLink.id}`,
  });

  expect(status2).toBe(200);
});
