import z from "@/lib/zod";
import { LinkSchema } from "@/lib/zod/schemas/links";
import { Link } from "@dub/prisma";
import { expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK } from "../utils/resource";
import { expectedLink } from "../utils/schema";

const { domain } = E2E_LINK;

test("POST /links/bulk", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http, user } = await h.init();
  const workspaceId = workspace.id;
  const projectId = workspaceId.replace("ws_", "");

  const bulkLinks = Array.from({ length: 2 }, () => ({
    url: `https://example.com/${randomId()}`,
    domain,
  }));

  const { status, data: links } = await http.post<Link[]>({
    path: "/links/bulk",
    body: bulkLinks,
  });

  const firstLink = links.find((l) => l.url === bulkLinks[0].url);
  const secondLink = links.find((l) => l.url === bulkLinks[1].url);

  expect(status).toEqual(200);
  expect(links).toHaveLength(2);
  expect(firstLink).toStrictEqual({
    ...expectedLink,
    url: bulkLinks[0].url,
    userId: user.id,
    projectId,
    workspaceId,
    shortLink: `https://${domain}/${firstLink?.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${firstLink?.key}?qr=1`,
  });
  expect(secondLink).toStrictEqual({
    ...expectedLink,
    url: bulkLinks[1].url,
    userId: user.id,
    projectId,
    workspaceId,
    shortLink: `https://${domain}/${secondLink?.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${secondLink?.key}?qr=1`,
  });
  expect(z.array(LinkSchema.strict()).parse(links)).toBeTruthy();

  await Promise.all([h.deleteLink(links[0].id), h.deleteLink(links[1].id)]);
});
