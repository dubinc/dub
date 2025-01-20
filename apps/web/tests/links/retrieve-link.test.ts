import { Link } from "@dub/prisma/client";
import { expectedLink } from "tests/utils/schema";
import { describe, expect, onTestFinished, test } from "vitest";
import { randomId } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK } from "../utils/resource";

const { domain, url } = E2E_LINK;

describe.sequential("GET /links/{linkId}", async () => {
  const h = new IntegrationHarness();
  const { workspace, http, user } = await h.init();
  const workspaceId = workspace.id;
  const projectId = workspaceId.replace("ws_", "");
  const externalId = randomId();
  const key = randomId();

  onTestFinished(async () => {
    await h.deleteLink(newLink.id);
  });

  const { data: newLink } = await http.post<Link>({
    path: "/links",
    body: {
      url,
      domain,
      key,
      externalId,
    },
  });

  test("by linkId", async () => {
    const { status, data: link } = await http.get<Link>({
      path: `/links/${newLink.id}`,
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      ...link,
      projectId,
      userId: user.id,
    });
  });

  test("by externalId", async () => {
    const { status, data: link } = await http.get<Link>({
      path: `/links/ext_${externalId}`,
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      ...link,
      projectId,
      userId: user.id,
    });
  });
});

describe.sequential("GET /links/info", async () => {
  const h = new IntegrationHarness();
  const { workspace, http, user } = await h.init();
  const workspaceId = workspace.id;
  const projectId = workspaceId.replace("ws_", "");
  const externalId = randomId();
  const key = randomId();

  onTestFinished(async () => {
    await h.deleteLink(newLink.id);
  });

  const { data: newLink } = await http.post<Link>({
    path: "/links",
    body: {
      url,
      domain,
      key,
      externalId,
    },
  });

  test("by domain and key", async () => {
    const { status, data: link } = await http.get<Link>({
      path: "/links/info",
      query: { workspaceId, domain, key },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      ...link,
      projectId,
      workspaceId,
      userId: user.id,
      shortLink: `https://${domain}/${key}`,
      qrCode: `https://api.dub.co/qr?url=https://${domain}/${key}?qr=1`,
    });
  });

  test("by linkId", async () => {
    const { status, data: link } = await http.get<Link>({
      path: "/links/info",
      query: { workspaceId, linkId: newLink.id },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      ...link,
      projectId,
      userId: user.id,
    });
  });

  test("by externalId", async () => {
    const { status, data: link } = await http.get<Link>({
      path: "/links/info",
      query: { workspaceId, externalId: `ext_${externalId}` },
    });

    expect(status).toEqual(200);
    expect(link).toStrictEqual({
      ...expectedLink,
      ...link,
      projectId,
      userId: user.id,
    });
  });
});
