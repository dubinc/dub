import { DUB_DOMAINS } from "@dub/utils";
import { Link } from "@prisma/client";
import { expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";
import { expectedLink } from "../utils/schema";

const { domain, url } = link;

test("PATCH /links/bulk", async (ctx) => {
  const h = new IntegrationHarness(ctx);
  const { workspace, http, user } = await h.init();
  const { workspaceId } = workspace;
  const projectId = workspaceId.replace("ws_", "");

  const { data: createdLinks } = await http.post<Link[]>({
    path: "/links/bulk",
    query: { workspaceId },
    body: [
      {
        url: `https://example.com/${randomId()}`,
        domain,
      },
      {
        url,
        domain: "git.new",
      },
    ],
  });

  // add a link that will not be found
  const linkIds = createdLinks.map(({ id }) => id).concat(["xxx"]);
  const newData = {
    url: `https://example.com/${randomId()}`,
    tagIds: ["clvkopm8b0009nf98azsp9epk"],
  };

  const { status, data: links } = await http.patch<Link[]>({
    path: "/links/bulk",
    query: { workspaceId },
    body: {
      linkIds,
      data: newData,
    },
  });

  expect(status).toEqual(200);
  expect(links).toHaveLength(3);

  // first link should be updated
  expect(links[0]).toStrictEqual({
    ...expectedLink,
    url: newData.url,
    userId: user.id,
    projectId,
    workspaceId,
    tagId: "clvkopm8b0009nf98azsp9epk",
    tags: [
      {
        id: "clvkopm8b0009nf98azsp9epk",
        name: "E2E Tests (DO NOT DELETE)",
        color: "red",
      },
    ],
    shortLink: `https://${domain}/${createdLinks[0].key}`,
    qrCode: `https://api.dub.co/qr?url=https://${domain}/${createdLinks[0].key}?qr=1`,
  });

  const { allowedHostnames } = DUB_DOMAINS.find((d) => d.slug === "git.new")!;

  // second link will throw an error because git.new only allows certain destination URLs
  expect(links[1]).toStrictEqual({
    error: `Invalid url. You can only use git.new short links for URLs starting with ${allowedHostnames!
      .map((d) => `\`${d}\``)
      .join(", ")}.`,
    code: "unprocessable_entity",
    link: createdLinks[1],
  });

  // third link should throw an error because it does not exist
  expect(links[2]).toStrictEqual({
    error: "Link not found",
    code: "not_found",
    link: { id: "xxx" },
  });

  await Promise.all([h.deleteLink(links[0].id), h.deleteLink(links[1].id)]);
});
