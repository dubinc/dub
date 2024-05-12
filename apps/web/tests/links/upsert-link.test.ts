import { Link } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";
import { expectedLink } from "../utils/schema";

const { domain } = link;
const url = `https://example.com/${randomId}`;

describe.sequential("PUT /links/upsert", async () => {
  const h = new IntegrationHarness();
  const { workspace, http } = await h.init();
  const { workspaceId } = workspace;

  test("New link", async () => {
    const { data: createdLink } = await http.put<Link>({
      path: "/links/upsert",
      query: { workspaceId },
      body: { domain, url },
    });

    expect(createdLink).toStrictEqual({
      ...expectedLink,
      domain,
      url,
      workspaceId,
    });

    test("Existing link", async () => {
      const { data: updatedLink } = await http.put<Link>({
        path: "/links/upsert",
        query: { workspaceId },
        body: { url },
      });

      expect(updatedLink).toStrictEqual({
        ...expectedLink,
        id: createdLink.id,
        domain,
        key: createdLink.key,
        url,
        workspaceId,
      });
    });

    await h.deleteLink(createdLink.id);
  });
});
