import { Link } from "@prisma/client";
import { afterAll, describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { expectedLink } from "../utils/schema";

const domain = "dub.sh";
const url = "https://github.com/dubinc/dub/pull/888";

describe.sequential("PUT /links/upsert", async () => {
  const h = new IntegrationHarness();
  const { workspace, user, http } = await h.init();
  const { workspaceId } = workspace;

  const { data: link } = await http.post<Link>({
    path: "/links",
    query: { workspaceId },
    body: {
      url,
      domain,
    },
  });

  afterAll(async () => {
    await h.deleteLink(link.id);
  });

  test("Existing link", async () => {
    const { data: updatedLink } = await http.put<Link>({
      path: `/links/upsert`,
      query: { workspaceId },
      body: { url },
    });

    expect(updatedLink).toStrictEqual({
      ...expectedLink,
      workspaceId,
      domain,
      key: link.key,
      url,
    });
  });

  test("New link", async () => {
    const newUrl = "https://github.com/dubinc/dub/pull/889";
    const { data: createdLink } = await http.put<Link>({
      path: `/links/upsert`,
      query: { workspaceId },
      body: { url: newUrl },
    });

    expect(createdLink).toStrictEqual({
      ...expectedLink,
      workspaceId,
      domain,
      url: newUrl,
    });

    await h.deleteLink(createdLink.id);
  });
});
