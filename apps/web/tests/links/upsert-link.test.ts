import { Link } from "@prisma/client";
import { afterAll, describe, expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK } from "../utils/resource";
import { expectedLink } from "../utils/schema";

const { domain } = E2E_LINK;
const url = `https://example.com/${randomId()}`;

describe.sequential("PUT /links/upsert", async () => {
  const h = new IntegrationHarness();
  const { workspace, user, http } = await h.init();
  const workspaceId = workspace.id;
  const projectId = workspaceId.replace("ws_", "");
  let createdLink: Link;

  afterAll(async () => {
    await h.deleteLink(createdLink.id);
  });

  test("New link", async () => {
    const { data } = await http.put<Link>({
      path: "/links/upsert",
      body: { domain, url },
    });

    createdLink = data;

    expect(createdLink).toStrictEqual({
      ...expectedLink,
      domain,
      url,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${createdLink.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${createdLink.key}?qr=1`,
    });
  });

  test("Existing link", async () => {
    const { data: updatedLink } = await http.put<Link>({
      path: "/links/upsert",
      body: { domain, url, comments: "Updated comment" },
    });

    expect(updatedLink).toStrictEqual({
      ...expectedLink,
      domain,
      url,
      userId: user.id,
      projectId,
      workspaceId,
      comments: "Updated comment",
      shortLink: `https://${domain}/${createdLink.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${createdLink.key}?qr=1`,
    });
  });
});
