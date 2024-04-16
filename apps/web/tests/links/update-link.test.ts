import { nanoid } from "@dub/utils";
import { Link } from "@prisma/client";
import { expect, test, describe, afterAll } from "vitest";
import { HttpClient } from "../utils/http";
import { IntegrationHarness } from "../utils/integration";
import { expectedLink } from "../utils/schema";
import { link } from "../utils/resource";

const { domain, url } = link;

// TODO:
// Make sure we cover all the fields
// Add/update/delete tags

describe("PUT /links/{linkId}", async () => {
  const h = new IntegrationHarness();
  const { workspace, apiKey, user } = await h.init();
  const { workspaceId, id: projectId } = workspace;

  const http = new HttpClient({
    baseUrl: h.baseUrl,
    headers: {
      Authorization: `Bearer ${apiKey.token}`,
    },
  });

  afterAll(async () => {
    await h.teardown();
  });

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
      key: nanoid(),
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

    expect(updatedLink).toMatchObject({
      ...expectedLink,
      ...newLink,
      expiresAt: "2030-04-16T18:29:59.000Z",
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
    }).toMatchObject(updatedLink);
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
    expect(updatedLink).toMatchObject({
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
    expect(updatedLink).toMatchObject({
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
  });
});
