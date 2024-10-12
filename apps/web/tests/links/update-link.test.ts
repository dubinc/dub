import { Link } from "@prisma/client";
import { afterAll, describe, expect, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK } from "../utils/resource";
import { expectedLink } from "../utils/schema";

const { domain, url } = E2E_LINK;

describe.sequential("PATCH /links/{linkId}", async () => {
  const h = new IntegrationHarness();
  const { workspace, http, user } = await h.init();
  const workspaceId = workspace.id;
  const projectId = workspaceId.replace("ws_", "");
  const externalId = randomId();

  const { data: link } = await http.post<Link>({
    path: "/links",
    body: {
      url,
      domain,
      externalId,
    },
  });

  const toUpdate: Partial<Link> = {
    key: randomId(),
    url: "https://github.com/dubinc/dub",
    title: "Dub Inc",
    description: "Open-source link management infrastructure.",
    publicStats: true,
    comments: "This is a comment.",
    expiresAt: new Date("2030-04-16T17:00:00.000Z"),
    expiredUrl: "https://github.com/expired",
    password: "link-password",
    ios: "https://apps.apple.com/app/1611158928",
    android:
      "https://play.google.com/store/apps/details?id=com.disney.disneyplus",
    geo: {
      AF: `${url}/AF`,
    },
  };

  afterAll(async () => {
    await h.deleteLink(link.id);
  });

  test("update link using linkId", async () => {
    const { data: updatedLink } = await http.patch<Link>({
      path: `/links/${link.id}`,
      body: { ...toUpdate },
    });

    expect(updatedLink).toStrictEqual({
      ...expectedLink,
      ...toUpdate,
      domain,
      workspaceId,
      externalId,
      userId: user.id,
      expiresAt: "2030-04-16T17:00:00.000Z",
      projectId,
      shortLink: `https://${domain}/${toUpdate.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${toUpdate.key}?qr=1`,
    });

    // Fetch the link
    const { data: fetchedLink } = await http.get<Link>({
      path: `/links/${link.id}`,
    });

    expect(fetchedLink).toStrictEqual({
      ...expectedLink,
      ...toUpdate,
      domain,
      workspaceId,
      externalId,
      userId: user.id,
      expiresAt: "2030-04-16T17:00:00.000Z",
      projectId,
      shortLink: `https://${domain}/${toUpdate.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${toUpdate.key}?qr=1`,
    });
  });

  // Archive the link
  test("archive link", async () => {
    const { status, data: updatedLink } = await http.patch<Link>({
      path: `/links/${link.id}`,
      body: {
        archived: true,
      },
    });

    expect(status).toEqual(200);
    expect(updatedLink).toStrictEqual({
      ...expectedLink,
      ...toUpdate,
      domain,
      workspaceId,
      externalId,
      archived: true,
      userId: user.id,
      expiresAt: "2030-04-16T17:00:00.000Z",
      projectId,
      shortLink: `https://${domain}/${toUpdate.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${toUpdate.key}?qr=1`,
    });

    // Fetch the link
    const { data: archivedLink } = await http.get<Link>({
      path: `/links/${link.id}`,
    });

    expect(archivedLink.archived).toEqual(true);
  });

  // Unarchive the link
  test("unarchive link", async () => {
    const { status, data: updatedLink } = await http.patch<Link>({
      path: `/links/${link.id}`,
      body: {
        archived: false,
      },
    });

    expect(status).toEqual(200);
    expect(updatedLink).toStrictEqual({
      ...expectedLink,
      ...toUpdate,
      domain,
      workspaceId,
      externalId,
      archived: false,
      userId: user.id,
      expiresAt: "2030-04-16T17:00:00.000Z",
      projectId,
      shortLink: `https://${domain}/${toUpdate.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${toUpdate.key}?qr=1`,
    });

    // Fetch the link
    const { data: unarchivedLink } = await http.get<Link>({
      path: `/links/${link.id}`,
    });

    expect(unarchivedLink.archived).toEqual(false);
  });

  // Update the link using externalId
  test("update link using externalId", async () => {
    const { status, data: updatedLink } = await http.patch<Link>({
      path: `/links/ext_${externalId}`,
      body: {
        url: "https://github.com/dubinc",
      },
    });

    expect(status).toEqual(200);
    expect(updatedLink).toStrictEqual({
      ...expectedLink,
      ...toUpdate,
      domain,
      workspaceId,
      externalId,
      archived: false,
      userId: user.id,
      url: "https://github.com/dubinc",
      expiresAt: "2030-04-16T17:00:00.000Z",
      projectId,
      shortLink: `https://${domain}/${toUpdate.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${toUpdate.key}?qr=1`,
    });

    // Fetch the link
    const { data: linkUpdated } = await http.get<Link>({
      path: `/links/ext_${externalId}`,
    });

    expect(linkUpdated.url).toEqual("https://github.com/dubinc");
  });
});

describe.sequential(
  "PUT /links/{linkId} (backwards compatibility)",
  async () => {
    const h = new IntegrationHarness();
    const { workspace, http, user } = await h.init();
    const workspaceId = workspace.id;
    const projectId = workspaceId.replace("ws_", "");
    const externalId = randomId();

    const { data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain,
        externalId,
      },
    });

    const toUpdate: Partial<Link> = {
      key: randomId(),
      url: "https://github.com/dubinc/dub",
      title: "Dub Inc",
      description: "Open-source link management infrastructure.",
      publicStats: true,
      comments: "This is a comment.",
      expiresAt: new Date("2030-04-16T17:00:00.000Z"),
      expiredUrl: "https://github.com/expired",
      password: "link-password",
      ios: "https://apps.apple.com/app/1611158928",
      android:
        "https://play.google.com/store/apps/details?id=com.disney.disneyplus",
      geo: {
        AF: `${url}/AF`,
      },
    };

    afterAll(async () => {
      await h.deleteLink(link.id);
    });

    test("update link using PUT", async () => {
      const { data: updatedLink } = await http.put<Link>({
        path: `/links/${link.id}`,
        body: { ...toUpdate },
      });

      expect(updatedLink).toStrictEqual({
        ...expectedLink,
        ...toUpdate,
        domain,
        workspaceId,
        externalId,
        userId: user.id,
        expiresAt: "2030-04-16T17:00:00.000Z",
        projectId,
        shortLink: `https://${domain}/${toUpdate.key}`,
        qrCode: `https://api.dub.co/qr?url=https://${domain}/${toUpdate.key}?qr=1`,
      });

      // Fetch the link
      const { data: fetchedLink } = await http.get<Link>({
        path: `/links/${link.id}`,
      });

      expect(fetchedLink).toStrictEqual({
        ...expectedLink,
        ...toUpdate,
        domain,
        workspaceId,
        externalId,
        userId: user.id,
        expiresAt: "2030-04-16T17:00:00.000Z",
        projectId,
        shortLink: `https://${domain}/${toUpdate.key}`,
        qrCode: `https://api.dub.co/qr?url=https://${domain}/${toUpdate.key}?qr=1`,
      });
    });
  },
);
