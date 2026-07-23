import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { get } from "@vercel/edge-config";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

type PartnerBetaFeaturesRecord = {
  postbacks?: string[];
};

class EdgeConfigNotConfiguredError extends Error {
  constructor() {
    super("Postback access storage is not configured.");
    this.name = "EdgeConfigNotConfiguredError";
  }
}

class PartnerAlreadyHasAccessError extends Error {
  constructor() {
    super("Partner already has postback access.");
    this.name = "PartnerAlreadyHasAccessError";
  }
}

class PartnerDoesNotHaveAccessError extends Error {
  constructor() {
    super("Partner does not have postback access.");
    this.name = "PartnerDoesNotHaveAccessError";
  }
}

const assertEdgeConfigReadable = () => {
  if (!process.env.EDGE_CONFIG) {
    throw new EdgeConfigNotConfiguredError();
  }
};

const assertEdgeConfigConfigured = () => {
  if (!process.env.EDGE_CONFIG || !process.env.EDGE_CONFIG_ID) {
    throw new EdgeConfigNotConfiguredError();
  }
};

const getPartnerBetaFeatures = async (): Promise<PartnerBetaFeaturesRecord> => {
  assertEdgeConfigReadable();

  try {
    return (await get<PartnerBetaFeaturesRecord>("partnerBetaFeatures")) ?? {};
  } catch (e) {
    console.error(`Error getting partner beta features: ${e}`);
    throw e;
  }
};

const getPostbackPartnerIdsForList = async (): Promise<string[]> => {
  if (!process.env.EDGE_CONFIG) {
    return [];
  }

  const betaFeatures = await getPartnerBetaFeatures();
  return betaFeatures.postbacks ?? [];
};

const updatePostbackPartnerIds = async ({
  add,
  remove,
}: {
  add?: string;
  remove?: string;
}) => {
  assertEdgeConfigConfigured();

  const betaFeatures = await getPartnerBetaFeatures();
  const partnerIds = new Set(betaFeatures.postbacks ?? []);

  if (add) {
    if (partnerIds.has(add)) {
      throw new PartnerAlreadyHasAccessError();
    }
    partnerIds.add(add);
  }

  if (remove) {
    if (!partnerIds.has(remove)) {
      throw new PartnerDoesNotHaveAccessError();
    }
    partnerIds.delete(remove);
  }

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
              postbacks: Array.from(partnerIds),
            },
          },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!res.ok) {
    throw new Error(
      `Failed to update partner postback access: ${res.status} ${await res.text()}`,
    );
  }
};

const edgeConfigErrorResponse = (error: unknown) => {
  if (
    error instanceof EdgeConfigNotConfiguredError ||
    error instanceof PartnerAlreadyHasAccessError ||
    error instanceof PartnerDoesNotHaveAccessError
  ) {
    return new Response(error.message, {
      status: error instanceof EdgeConfigNotConfiguredError ? 503 : 400,
    });
  }

  console.error(`Partner postback access Edge Config error: ${error}`);
  return new Response("Failed to update partner postback access.", {
    status: 503,
  });
};

// GET /api/admin/partners/postbacks
export const GET = withAdmin(async () => {
  let partnerIds: string[];

  try {
    partnerIds = await getPostbackPartnerIdsForList();
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

    try {
      await updatePostbackPartnerIds({ add: partner.id });
    } catch (error) {
      return edgeConfigErrorResponse(error);
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
    const { partnerId } = z
      .object({
        partnerId: z.string().trim().min(1),
      })
      .parse(await req.json());

    try {
      assertEdgeConfigConfigured();
      const betaFeatures = await getPartnerBetaFeatures();
      if (!(betaFeatures.postbacks ?? []).includes(partnerId)) {
        throw new PartnerDoesNotHaveAccessError();
      }
    } catch (error) {
      return edgeConfigErrorResponse(error);
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
      await updatePostbackPartnerIds({ remove: partnerId });
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

      return edgeConfigErrorResponse(error);
    }

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
