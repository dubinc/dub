import { createId } from "@/lib/api/create-id";
import { hashToken } from "@/lib/auth/hash-token";
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

type PartnerProfileLink = {
  id: string;
  domain: string;
  key: string;
  url: string;
  partnerGroupDefaultLinkId?: string | null;
};

async function createPartnerProfileAuth(partner: {
  id: string;
  email?: string | null;
}) {
  const token = `dub_pw_${nanoid(24)}`;
  const user = await prisma.user.create({
    data: {
      id: createId({ prefix: "user_" }),
      email: partner.email,
      emailVerified: new Date(),
      defaultPartnerId: partner.id,
      partners: {
        create: {
          partnerId: partner.id,
          role: "owner",
        },
      },
      tokens: {
        create: {
          name: "Playwright partner profile",
          hashedKey: await hashToken(token),
          partialKey: `${token.slice(0, 3)}...${token.slice(-4)}`,
        },
      },
    },
  });

  return { token, userId: user.id };
}

test("GET /partner-profile/programs/:id/links - workspace token is rejected", async ({
  api,
  program,
}) => {
  expect(
    await api.get(`/api/partner-profile/programs/${program.id}/links`),
  ).toEqual(
    apiError({
      code: "not_found",
      message: "Partner profile not found.",
    }),
  );
});

test("POST /partner-profile/programs/:id/links - default URL", async ({
  api,
  program,
  playwright,
}) => {
  let partnerId: string | undefined;
  let userId: string | undefined;

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;
    const auth = await createPartnerProfileAuth(partner);
    userId = auth.userId;

    const { api: partnerApi, dispose } = await createBearerApiClient({
      playwright,
      token: auth.token,
    });

    try {
      const key = nanoid(8);
      const { status, data } = await partnerApi.post<PartnerProfileLink>(
        `/api/partner-profile/programs/${program.id}/links`,
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
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await deletePartner(partnerId);
  }
});

test("POST /partner-profile/programs/:id/links - URL outside additionalLinks", async ({
  api,
  program,
  playwright,
}) => {
  let partnerId: string | undefined;
  let userId: string | undefined;

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;
    const auth = await createPartnerProfileAuth(partner);
    userId = auth.userId;

    const { api: partnerApi, dispose } = await createBearerApiClient({
      playwright,
      token: auth.token,
    });

    try {
      expect(
        await partnerApi.post(
          `/api/partner-profile/programs/${program.id}/links`,
          {
            key: nanoid(8),
            url: `https://github.com/dubinc/${nanoid()}`,
          },
        ),
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
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await deletePartner(partnerId);
  }
});

test("POST /partner-profile/programs/:id/links - allowed additionalLinks domain", async ({
  api,
  program,
  playwright,
}) => {
  let partnerId: string | undefined;
  let userId: string | undefined;
  let groupId: string | undefined;

  try {
    const group = await createGroupWithAdditionalLinks(program.id);
    groupId = group.id;

    const { data: partner } = await createPartner(api, { groupId });
    partnerId = partner.id;
    const auth = await createPartnerProfileAuth(partner);
    userId = auth.userId;

    const { api: partnerApi, dispose } = await createBearerApiClient({
      playwright,
      token: auth.token,
    });
    const url = `https://example.com/${nanoid()}`;

    try {
      const { status, data } = await partnerApi.post<PartnerProfileLink>(
        `/api/partner-profile/programs/${program.id}/links`,
        { key: nanoid(8), url },
      );

      expect(status).toEqual(201);
      expect(data.url).toEqual(url);
    } finally {
      await dispose();
    }
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await deletePartner(partnerId);
    if (groupId) await prisma.partnerGroup.delete({ where: { id: groupId } });
  }
});

test("PATCH /partner-profile/programs/:id/links/:linkId - cannot change default link URL", async ({
  api,
  program,
  playwright,
}) => {
  let partnerId: string | undefined;
  let userId: string | undefined;

  try {
    const { data: partner } = await createPartner(api);
    partnerId = partner.id;
    const auth = await createPartnerProfileAuth(partner);
    userId = auth.userId;

    const { api: partnerApi, dispose } = await createBearerApiClient({
      playwright,
      token: auth.token,
    });

    try {
      const { data: links } = await partnerApi.get<PartnerProfileLink[]>(
        `/api/partner-profile/programs/${program.id}/links`,
      );
      const defaultLink =
        links.find((link) => link.partnerGroupDefaultLinkId) ?? links[0];

      expect(
        await partnerApi.patch(
          `/api/partner-profile/programs/${program.id}/links/${defaultLink.id}`,
          {
            key: defaultLink.key,
            url: `https://example.com/${nanoid()}`,
          },
        ),
      ).toEqual(
        apiError({
          code: "forbidden",
          message:
            "You cannot update the destination URL of your default link.",
        }),
      );
    } finally {
      await dispose();
    }
  } finally {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await deletePartner(partnerId);
  }
});
