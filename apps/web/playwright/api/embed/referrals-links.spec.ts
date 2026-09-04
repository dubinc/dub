import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError } from "../../utils";
import { createBearerApiClient, test } from "../fixtures";
import {
  createGroupWithAdditionalLinks,
  createPartner,
  deletePartner,
} from "../partners/helpers";
import { TEST_WORKSPACE } from "../setup-test-workspace";

type EmbedLink = {
  id: string;
  domain: string;
  key: string;
  url: string;
};

test.describe.configure({ mode: "serial" });

test("GET /embed/referrals/links", async ({ api, playwright }) => {
  let partnerId: string | undefined;

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;

    const { status: tokenStatus, data: token } = await api.post<{
      publicToken: string;
    }>("/api/tokens/embed/referrals", { partnerId: partner.id });
    expect(tokenStatus).toEqual(201);

    const { api: embedApi, dispose } = await createBearerApiClient({
      playwright,
      token: token.publicToken,
    });

    try {
      const { status, data } = await embedApi.get<EmbedLink[]>(
        "/api/embed/referrals/links",
      );

      expect(status).toEqual(200);
      expect(data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: partner.links![0].id,
            domain: TEST_WORKSPACE.program.domain,
          }),
        ]),
      );
    } finally {
      await dispose();
    }
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /embed/referrals/links - default URL", async ({
  api,
  playwright,
}) => {
  let partnerId: string | undefined;

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;

    const { data: token } = await api.post<{ publicToken: string }>(
      "/api/tokens/embed/referrals",
      { partnerId: partner.id },
    );
    const { api: embedApi, dispose } = await createBearerApiClient({
      playwright,
      token: token.publicToken,
    });
    const key = nanoid(8);

    try {
      const { status, data } = await embedApi.post<EmbedLink>(
        "/api/embed/referrals/links",
        { key },
      );

      expect(status).toEqual(201);
      expect(data).toMatchObject({
        id: expect.any(String),
        domain: TEST_WORKSPACE.program.domain,
        key,
        shortLink: `https://${TEST_WORKSPACE.program.domain}/${key}`,
      });
    } finally {
      await dispose();
    }
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /embed/referrals/links - URL outside additionalLinks", async ({
  api,
  playwright,
}) => {
  let partnerId: string | undefined;

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;

    const { data: token } = await api.post<{ publicToken: string }>(
      "/api/tokens/embed/referrals",
      { partnerId: partner.id },
    );
    const { api: embedApi, dispose } = await createBearerApiClient({
      playwright,
      token: token.publicToken,
    });

    try {
      expect(
        await embedApi.post("/api/embed/referrals/links", {
          key: nanoid(8),
          url: `https://github.com/dubinc/${nanoid()}`,
        }),
      ).toEqual(
        apiError({
          code: "bad_request",
          message: "You cannot create additional links for this program.",
        }),
      );
    } finally {
      await dispose();
    }
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /embed/referrals/links - allowed additionalLinks domain", async ({
  api,
  program,
  playwright,
}) => {
  let partnerId: string | undefined;
  let groupId: string | undefined;

  try {
    const group = await createGroupWithAdditionalLinks(program.id);
    groupId = group.id;

    const { data: partner } = await createPartner(api, { groupId });
    partnerId = partner.id;

    const { data: token } = await api.post<{ publicToken: string }>(
      "/api/tokens/embed/referrals",
      { partnerId: partner.id },
    );
    const { api: embedApi, dispose } = await createBearerApiClient({
      playwright,
      token: token.publicToken,
    });
    const url = `https://example.com/${nanoid()}`;

    try {
      const { status, data } = await embedApi.post<EmbedLink>(
        "/api/embed/referrals/links",
        { key: nanoid(8), url },
      );

      expect(status).toEqual(201);
      expect(data.url).toEqual(url);
    } finally {
      await dispose();
    }
  } finally {
    await deletePartner(partnerId);
    if (groupId) await prisma.partnerGroup.delete({ where: { id: groupId } });
  }
});

test("POST /embed/referrals/links - mismatched additionalLinks domain", async ({
  api,
  program,
  playwright,
}) => {
  let partnerId: string | undefined;
  let groupId: string | undefined;

  try {
    const group = await createGroupWithAdditionalLinks(program.id);
    groupId = group.id;

    const { data: partner } = await createPartner(api, { groupId });
    partnerId = partner.id;

    const { data: token } = await api.post<{ publicToken: string }>(
      "/api/tokens/embed/referrals",
      { partnerId: partner.id },
    );
    const { api: embedApi, dispose } = await createBearerApiClient({
      playwright,
      token: token.publicToken,
    });

    try {
      expect(
        await embedApi.post("/api/embed/referrals/links", {
          key: nanoid(8),
          url: `https://github.com/dubinc/${nanoid()}`,
        }),
      ).toEqual(
        apiError({
          code: "bad_request",
          message:
            "The provided URL's domain (github.com) does not match the program's link domains.",
        }),
      );
    } finally {
      await dispose();
    }
  } finally {
    await deletePartner(partnerId);
    if (groupId) await prisma.partnerGroup.delete({ where: { id: groupId } });
  }
});

test("GET /embed/referrals/links - invalid token", async ({ playwright }) => {
  const { api: embedApi, dispose } = await createBearerApiClient({
    playwright,
    token: "dub_embed_invalid",
  });

  try {
    expect(await embedApi.get("/api/embed/referrals/links")).toEqual(
      apiError({
        code: "unauthorized",
        message: "Invalid embed public token.",
      }),
    );
  } finally {
    await dispose();
  }
});
