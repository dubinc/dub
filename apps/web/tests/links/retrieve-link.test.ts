import { nanoid } from "@dub/utils";
import { Link } from "@prisma/client";
import { expectedLink } from "tests/utils/schema";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";

const { domain, url } = link;

test("GET /links/info", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http, user } = await h.init();
  const { workspaceId, id: projectId } = workspace;

  const newLink: Partial<Link> = {
    url,
    domain,
    key: nanoid(6),
    archived: true,
    publicStats: true,
    comments: "This is a test",
    expiresAt: new Date("2030-04-16 23:59:59"),
    expiredUrl: "https://github.com/expired",
    password: "link-password",
    ios: "https://apps.apple.com/app/1611158928",
    android:
      "https://play.google.com/store/apps/details?id=com.disney.disneyplus",
    geo: {
      AF: `${url}/AF`,
    },
    title: "custom title",
    description: "custom description",
  };

  const { status, data: link } = await http.post<Link>({
    path: "/links",
    query: { workspaceId },
    body: { ...newLink, prefix: "prefix" },
  });

  expect(status).toEqual(200);
  expect(link).toMatchObject({
    ...expectedLink,
    ...newLink,
    expiresAt: "2030-04-16T18:29:59.000Z",
    userId: user.id,
    projectId,
    workspaceId,
    shortLink: `https://${domain}/${newLink.key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${newLink.key}?qr=1`,
    tags: [],
  });

  await h.deleteLink(link.id);
});
