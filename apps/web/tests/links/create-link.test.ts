import { normalizeWorkspaceId } from "@/lib/api/workspace-id";
import z from "@/lib/zod";
import { FolderSchema } from "@/lib/zod/schemas/folders";
import { Link, Tag } from "@dub/prisma/client";
import { IntegrationHarnessOld } from "tests/utils/integration-old";
import { describe, expect, onTestFinished, test } from "vitest";
import { randomId, randomTagName } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK, E2E_WEBHOOK_ID } from "../utils/resource";
import { LinkSchema, expectedLink } from "../utils/schema";

type FolderRecord = z.infer<typeof FolderSchema>;

const { domain, url } = E2E_LINK;

describe.sequential("POST /links", async () => {
  const h = new IntegrationHarness();
  const { workspace, user, http } = await h.init();
  const workspaceId = workspace.id;
  const projectId = normalizeWorkspaceId(workspaceId);

  test("public link", async () => {
    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain: "dub.sh",
        publicStats: true,
      },
      headers: {
        Authorization: "",
        "dub-anonymous-link-creation": "1",
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      publicStats: true,
      rewrite: false,
      userId: null,
      projectId: null,
      workspaceId: null,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
  });

  test("default domain", async ({ onTestFinished }) => {
    const externalId = randomId();

    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        comments: "This is a test",
        rewrite: true,
        domain,
        externalId,
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      externalId,
      comments: "This is a test",
      rewrite: true,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("user defined key", async ({ onTestFinished }) => {
    const key = randomId();

    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        key,
        domain,
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      key,
      url,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${key}?qr=1`,
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("prefix", async () => {
    const prefix = "gh";

    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<
      Link & { shortLink: string }
    >({
      path: "/links",
      body: {
        url,
        domain,
        prefix,
      },
    });

    expect(status).toEqual(200);
    expect(link.key.startsWith(prefix)).toBeTruthy();
    expect(link).toStrictEqual({
      ...expectedLink,
      domain,
      url,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("utm builder", async () => {
    const longUrl = new URL(url);
    const utm = {
      utm_source: "facebook",
      utm_medium: "social",
      utm_campaign: "summer",
      utm_term: "shoes",
      utm_content: "cta",
    };

    Object.keys(utm).forEach((key) => {
      longUrl.searchParams.set(key, utm[key]);
    });

    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url: longUrl.href,
        domain,
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      ...utm,
      url: longUrl.href,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("password protection", async () => {
    const password = "link-password";

    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain,
        password,
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      password,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("link expiration", async () => {
    const expiresAt = new Date("2030-04-16T17:00:00.000Z");
    const expiredUrl = "https://github.com/expired";

    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain,
        expiresAt,
        expiredUrl,
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      expiresAt: "2030-04-16T17:00:00.000Z",
      expiredUrl,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("device targeting", async () => {
    const ios = "https://apps.apple.com/app/1611158928";
    const android =
      "https://play.google.com/store/apps/details?id=com.disney.disneyplus";

    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain,
        ios,
        android,
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      ios,
      android,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("geo targeting", async () => {
    const geo = {
      AF: `${url}/AF`,
      AL: `${url}/AL`,
      DZ: `${url}/DZ`,
    };

    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain,
        geo,
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      geo,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("tags", async () => {
    const tagsToCreate = [
      { tag: randomTagName(), color: "red" },
      { tag: randomTagName(), color: "green" },
    ];

    const response = await Promise.all(
      tagsToCreate.map(({ tag, color }) =>
        http.post<Tag>({
          path: "/tags",
          body: { tag, color },
        }),
      ),
    );

    const tagIds = response.map((r) => r.data.id);
    const tags = response.map((r) => {
      return {
        id: r.data.id,
        name: r.data.name,
        color: r.data.color,
      };
    });

    onTestFinished(async () => {
      await Promise.all([
        ...tagIds.map((id) => h.deleteTag(id)),
        h.deleteLink(link.id),
      ]);
    });

    const { status, data: link } = await http.post<Link & { tags: [] }>({
      path: "/links",
      body: {
        url,
        domain,
        tagIds,
      },
    });

    expect(status).toEqual(200);
    expect(link.tags).toHaveLength(2);
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      tagId: expect.any(String), // TODO: Fix this
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      tags: expect.arrayContaining(tags),
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("folders", async () => {
    onTestFinished(async () => {
      await Promise.all([h.deleteFolder(folder.id), h.deleteLink(link.id)]);
    });

    const { data: folder } = await http.post<FolderRecord>({
      path: "/folders",
      body: { name: randomId() },
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain,
        folderId: folder.id,
      },
    });

    expect(status).toEqual(200);
    expect(link.folderId).toEqual(folder.id);
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      folderId: folder.id,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
  });

  test("custom social media cards", async () => {
    const title = "custom title";
    const description = "custom description";

    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain,
        title,
        description,
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      title,
      description,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("webhooks", async () => {
    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link & { tags: [] }>({
      path: "/links",
      body: {
        url,
        domain,
        webhookIds: [E2E_WEBHOOK_ID],
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
      webhookIds: [E2E_WEBHOOK_ID],
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });
});

describe.sequential("POST /links?workspaceId=xxx", async () => {
  const h = new IntegrationHarnessOld();
  const { workspace, user, http } = await h.init();
  const workspaceId = workspace.id;
  const projectId = normalizeWorkspaceId(workspaceId);

  test("create link with old personal API keys approach", async () => {
    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        url,
        domain,
      },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      url,
      userId: user.id,
      projectId,
      workspaceId,
      shortLink: `https://${domain}/${link.key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${link.key}?qr=1`,
    });
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });
});
