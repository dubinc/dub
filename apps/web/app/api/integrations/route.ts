import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { oAuthAppSchema } from "@/lib/zod/schemas/oauth";
import { getSearchParams } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

// GET /api/integrations - get all integrations on Dub
export const GET = async (req: NextRequest) => {
  const { page } = getSearchParams(req.url);

  const integrations = await prisma.oAuthApp.findMany({
    where: {
      verified: true,
    },
    include: {
      _count: {
        select: {
          authorizedApps: true,
        },
      },
    },
    take: 50,
    skip: (page ? parseInt(page) : 1 - 1) * 50,
  });

  return NextResponse.json(
    z
      .array(
        oAuthAppSchema
          .omit({
            clientSecret: true,
            redirectUri: true,
            pkce: true,
          })
          .merge(
            z.object({
              installations: z.number(),
            }),
          ),
      )
      .parse(
        integrations.map((integration) => ({
          ...integration,
          installations: integration._count.authorizedApps,
        })),
      ),
  );
};
