import { Link } from "@prisma/client";
import { describe, expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { link } from "../utils/resource";
import { expectedLink } from "../utils/schema";

const { domain, url } = link;

describe("PUT /links/{linkId}", async () => {
  const h = new IntegrationHarness();
  const { workspace, http, user } = await h.init();
  const { workspaceId } = workspace;
  const projectId = workspaceId.replace("ws_", "");

  test("update link", async () => {
    // Update the link with new data
    const { data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
        domain,
      },
    });

    const newLink: Partial<Link> = {
      key: randomId(),
      url: "https://github.com/dubinc/dub",
      title: "Dub Inc",
      description: "Open-source link management infrastructure.",
      publicStats: true,
      comments: "This is a comment.",
      expiresAt: new Date("2030-04-16 23:59:59"),
      expiredUrl: "https://github.com/expired",
      password: "link-password",
      ios: "https://apps.apple.com/app/1611158928",
      android:
        "https://play.google.com/store/apps/details?id=com.disney.disneyplus",
      geo: {
        AF: `${url}/AF`,
      },
    };

    const { data: updatedLink } = await http.put<Link>({
      path: `/links/${link.id}`,
      query: { workspaceId },
      body: newLink,
    });

    expect(updatedLink).toStrictEqual({
      ...expectedLink,
      ...newLink,
      expiresAt: "2030-04-16T23:59:59.000Z",
      domain,
      projectId,
      workspaceId,
      userId: user.id,
      shortLink: `https://${domain}/${newLink.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${newLink.key}?qr=1`,
      tags: [],
    });

    // Fetch the link
    const { data: fetchedLink } = await http.get<Link>({
      path: `/links/${link.id}`,
      query: { workspaceId },
    });

    expect({
      ...fetchedLink,
      workspaceId,
      shortLink: `https://${domain}/${newLink.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${newLink.key}?qr=1`,
    }).toStrictEqual(updatedLink);

    await h.deleteLink(link.id);
  });

  // Archive the link
  test("archive link", async () => {
    const { data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
        domain,
      },
    });

    const { status, data: updatedLink } = await http.put<Link>({
      path: `/links/${link.id}`,
      query: { workspaceId },
      body: {
        archived: true,
      },
    });

    expect(status).toEqual(200);
    expect(updatedLink).toStrictEqual({
      ...expectedLink,
      archived: true,
      domain,
      url: link.url,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });

    // Fetch the link
    const { data: archivedLink } = await http.get<Link>({
      path: `/links/${link.id}`,
      query: { workspaceId },
    });

    expect(archivedLink.archived).toEqual(true);

    await h.deleteLink(link.id);
  });

  // Unarchive the link
  test("unarchive link", async () => {
    const { data: link } = await http.post<Link>({
      path: "/links",
      query: { workspaceId },
      body: {
        url,
        domain,
      },
    });

    const { status, data: updatedLink } = await http.put<Link>({
      path: `/links/${link.id}`,
      query: { workspaceId },
      body: {
        archived: false,
      },
    });

    expect(status).toEqual(200);
    expect(updatedLink).toStrictEqual({
      ...expectedLink,
      archived: false,
      domain,
      url: link.url,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: [],
    });

    // Fetch the link
    const { data: unarchivedLink } = await http.get<Link>({
      path: `/links/${link.id}`,
      query: { workspaceId },
    });

    expect(unarchivedLink.archived).toEqual(false);

    await h.deleteLink(link.id);
  });
});
