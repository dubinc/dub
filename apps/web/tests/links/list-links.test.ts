import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";

const { domain, url } = link;

test("GET /links", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http, user } = await h.init();
  const { workspaceId, id: projectId } = workspace;

  // Create a link
  const { data: firstLink } = await http.post<Link>({
    path: "/links",
    query: { workspaceId },
    body: { url, domain },
  });

  // Fake delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Create another link
  const { data: secondLink } = await http.post<Link>({
    path: "/links",
    query: { workspaceId },
    body: { url, domain },
  });

  // List links
  const { data: links, status } = await http.get<Link[]>({
    path: "/links",
    query: { workspaceId },
  });

  expect(status).toEqual(200);
  expect(links.length).toBeGreaterThanOrEqual(2);
  // expect(links).toContain([
  //   {
  //     ...expectedLink,
  //     domain,
  //     url,
  //     userId: user.id,
  //     projectId,
  //     workspaceId,
  //     tags: [],
  //     shortLink: `https://${domain}/${secondLink.key}`,
  //     qrCode: `https://api.dub.co/qr?url=https://${domain}/${secondLink.key}?qr=1`,
  //     user: {
  //       id: user.id,
  //       createdAt: expect.any(String),
  //       email: expect.any(String),
  //       emailVerified: null,
  //       image: expect.any(String),
  //       name: expect.any(String),
  //       source: null,
  //       subscribed: true,
  //     },
  //   },
  //   {
  //     ...expectedLink,
  //     domain,
  //     url,
  //     userId: user.id,
  //     projectId,
  //     workspaceId,
  //     tags: [],
  //     shortLink: `https://${domain}/${firstLink.key}`,
  //     qrCode: `https://api.dub.co/qr?url=https://${domain}/${firstLink.key}?qr=1`,
  //     user: {
  //       id: user.id,
  //       createdAt: expect.any(String),
  //       email: expect.any(String),
  //       emailVerified: null,
  //       image: expect.any(String),
  //       name: expect.any(String),
  //       source: null,
  //       subscribed: true,
  //     },
  //   },
  // ]);

  await Promise.all([h.deleteLink(firstLink.id), h.deleteLink(secondLink.id)]);
});
