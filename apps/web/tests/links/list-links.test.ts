import { normalizeWorkspaceId } from "@/lib/api/workspace-id";
import { Link } from "@dub/prisma/client";
import { expect, onTestFinished, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK } from "../utils/resource";

const { domain, url } = E2E_LINK;

test("GET /links", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http, user } = await h.init();
  const workspaceId = workspace.id;
  const projectId = normalizeWorkspaceId(workspaceId);

  onTestFinished(async () => {
    await h.deleteLink(firstLink.id);
  });

  const { data: firstLink } = await http.post<Link>({
    path: "/links",
    body: { url, domain },
  });

  const { data: links, status } = await http.get<Link[]>({
    path: "/links",
  });

  const linkFound = links.find((l) => l.id === firstLink.id);

  expect(status).toEqual(200);
  expect(links.length).toBeGreaterThanOrEqual(1);
  expect(linkFound).toStrictEqual({
    ...firstLink,
    domain,
    url,
    userId: user.id,
    projectId,
    workspaceId,
    shortLink: `https://${domain}/${firstLink.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${firstLink.key}?qr=1`,
  });
});
