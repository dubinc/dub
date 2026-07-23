import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { get } from "@vercel/edge-config";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

type PartnerBetaFeaturesRecord = {
  postbacks?: string[];
};

const getPostbackPartnerIds = async (): Promise<string[]> => {
  if (!process.env.EDGE_CONFIG) {
    return [];
  }

  try {
    const betaFeatures =
      (await get<PartnerBetaFeaturesRecord>("partnerBetaFeatures")) ?? {};
    return betaFeatures.postbacks ?? [];
  } catch (e) {
    console.error(`Error getting partner postback access: ${e}`);
    return [];
  }
};

const setPostbackPartnerIds = async (partnerIds: string[]) => {
  if (!process.env.EDGE_CONFIG_ID) {
    return;
  }

  let betaFeatures: PartnerBetaFeaturesRecord = {};

  try {
    betaFeatures =
      (await get<PartnerBetaFeaturesRecord>("partnerBetaFeatures")) ?? {};
  } catch (e) {
    console.error(`Error getting partner beta features: ${e}`);
  }

  await fetch(
    `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items?teamId=${process.env.TEAM_ID_VERCEL}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            operation: "upsert",
            key: "partnerBetaFeatures",
            value: {
              ...betaFeatures,
              postbacks: partnerIds,
            },
          },
        ],
      }),
    },
  );
};

// GET /api/admin/partners/postbacks
export const GET = withAdmin(async () => {
  const partnerIds = await getPostbackPartnerIds();

  if (partnerIds.length === 0) {
    return NextResponse.json({ partners: [] });
  }

  const partners = await prisma.partner.findMany({
    where: {
      id: { in: partnerIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      _count: {
        select: {
          postbacks: {
            where: {
              disabledAt: null,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    partners: partners.map((partner) => ({
      id: partner.id,
      name: partner.name,
      email: partner.email,
      image: partner.image,
      postbackCount: partner._count.postbacks,
    })),
  });
});

// POST /api/admin/partners/postbacks
export const POST = withAdmin(
  async ({ req }) => {
    const { partnerIdOrEmail } = z
      .object({
        partnerIdOrEmail: z.string().trim().min(1),
      })
      .parse(await req.json());

    if (
      !partnerIdOrEmail.startsWith("pn_") &&
      !partnerIdOrEmail.includes("@")
    ) {
      return new Response("Invalid partner ID or email.", { status: 400 });
    }

    const partner = await prisma.partner.findFirst({
      where: partnerIdOrEmail.startsWith("pn_")
        ? { id: partnerIdOrEmail }
        : { email: partnerIdOrEmail },
      select: {
        id: true,
      },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    const partnerIds = await getPostbackPartnerIds();

    if (partnerIds.includes(partner.id)) {
      return new Response("Partner already has postback access.", {
        status: 400,
      });
    }

    await setPostbackPartnerIds([...partnerIds, partner.id]);

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);

// DELETE /api/admin/partners/postbacks
export const DELETE = withAdmin(
  async ({ req }) => {
    const { partnerId } = z
      .object({
        partnerId: z.string().trim().min(1),
      })
      .parse(await req.json());

    const partnerIds = await getPostbackPartnerIds();

    if (!partnerIds.includes(partnerId)) {
      return new Response("Partner does not have postback access.", {
        status: 400,
      });
    }

    await setPostbackPartnerIds(partnerIds.filter((id) => id !== partnerId));

    await prisma.postback.updateMany({
      where: {
        partnerId,
        disabledAt: null,
      },
      data: {
        disabledAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
