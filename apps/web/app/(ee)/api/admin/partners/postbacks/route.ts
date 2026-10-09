import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { get } from "@vercel/edge-config";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

type PartnerBetaFeaturesRecord = {
  postbacks?: string[];
};

const getPartnerBetaFeatures = async () => {
  const betaFeatures = await get<PartnerBetaFeaturesRecord>(
    "partnerBetaFeatures",
  );

  return betaFeatures ?? {};
};

const setPostbackPartnerIds = async (
  betaFeatures: PartnerBetaFeaturesRecord,
  partnerIds: string[],
) => {
  const res = await fetch(
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

  if (!res.ok) {
    throw new Error(
      `Failed to update partner postback access: ${res.status} ${await res.text()}`,
    );
  }
};

// GET /api/admin/partners/postbacks
export const GET = withAdmin(async () => {
  if (!process.env.EDGE_CONFIG) {
    return NextResponse.json({ partners: [] });
  }

  let partnerIds: string[];

  try {
    const betaFeatures = await getPartnerBetaFeatures();
    partnerIds = betaFeatures.postbacks ?? [];
  } catch (error) {
    console.error(`Error listing partner postback access: ${error}`);
    return new Response("Failed to load partner postback access.", {
      status: 503,
    });
  }

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
    const parsed = z
      .object({
        partnerIdOrEmail: z.string().trim().min(1),
      })
      .safeParse(await req.json());

    if (!parsed.success) {
      return new Response("Invalid request body.", { status: 400 });
    }

    const { partnerIdOrEmail } = parsed.data;

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

    if (!process.env.EDGE_CONFIG || !process.env.EDGE_CONFIG_ID) {
      return new Response("Postback access storage is not configured.", {
        status: 503,
      });
    }

    try {
      const betaFeatures = await getPartnerBetaFeatures();
      const partnerIds = betaFeatures.postbacks ?? [];

      if (partnerIds.includes(partner.id)) {
        return new Response("Partner already has postback access.", {
          status: 400,
        });
      }

      await setPostbackPartnerIds(betaFeatures, [...partnerIds, partner.id]);
    } catch (error) {
      console.error(`Error granting partner postback access: ${error}`);
      return new Response("Failed to update partner postback access.", {
        status: 503,
      });
    }

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);

// DELETE /api/admin/partners/postbacks
export const DELETE = withAdmin(
  async ({ req }) => {
    const parsed = z
      .object({
        partnerId: z.string().trim().min(1),
      })
      .safeParse(await req.json());

    if (!parsed.success) {
      return new Response("Invalid request body.", { status: 400 });
    }

    const { partnerId } = parsed.data;

    if (!process.env.EDGE_CONFIG || !process.env.EDGE_CONFIG_ID) {
      return new Response("Postback access storage is not configured.", {
        status: 503,
      });
    }

    let betaFeatures: PartnerBetaFeaturesRecord;

    try {
      betaFeatures = await getPartnerBetaFeatures();
    } catch (error) {
      console.error(`Error reading partner postback access: ${error}`);
      return new Response("Failed to update partner postback access.", {
        status: 503,
      });
    }

    const partnerIds = betaFeatures.postbacks ?? [];

    if (!partnerIds.includes(partnerId)) {
      return new Response("Partner does not have postback access.", {
        status: 400,
      });
    }

    const disabledAt = new Date();

    await prisma.postback.updateMany({
      where: {
        partnerId,
        disabledAt: null,
      },
      data: {
        disabledAt,
      },
    });

    try {
      await setPostbackPartnerIds(
        betaFeatures,
        partnerIds.filter((id) => id !== partnerId),
      );
    } catch (error) {
      await prisma.postback.updateMany({
        where: {
          partnerId,
          disabledAt,
        },
        data: {
          disabledAt: null,
        },
      });

      console.error(`Error revoking partner postback access: ${error}`);
      return new Response("Failed to update partner postback access.", {
        status: 503,
      });
    }

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
