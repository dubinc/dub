import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  createOrUpdateDefaultLinkSchema,
  MAX_DEFAULT_PARTNER_LINKS,
  PartnerGroupDefaultLinkSchema,
} from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/groups/[groupIdOrSlug]/default-links - get all default links for a group
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      programId,
      groupId: params.groupIdOrSlug,
    });

    const defaultLinks = await prisma.partnerGroupDefaultLink.findMany({
      where: {
        groupId: group.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      z.array(PartnerGroupDefaultLinkSchema).parse(defaultLinks),
    );
  },
  {
    requiredPermissions: ["groups.read"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);

// POST /api/groups/[groupIdOrSlug]/default-links - create a default link for a group
export const POST = withWorkspace(
  async ({ workspace, req, params, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { domain, url } = createOrUpdateDefaultLinkSchema.parse(
      await parseRequestBody(req),
    );

    const group = await getGroupOrThrow({
      programId,
      groupId: params.groupIdOrSlug,
    });

    // Check the domain
    const domainRecord = await prisma.domain.findUniqueOrThrow({
      where: {
        slug: domain,
      },
    });

    if (domainRecord.projectId !== workspace.id) {
      throw new DubApiError({
        code: "forbidden",
        message: `Domain ${domain} does not belong to your workspace ${workspace.name}.`,
      });
    }

    const defaultLink = await prisma.$transaction(async (tx) => {
      const count = await tx.partnerGroupDefaultLink.count({
        where: {
          groupId: group.id,
        },
      });

      if (count >= MAX_DEFAULT_PARTNER_LINKS) {
        throw new DubApiError({
          code: "bad_request",
          message: `You can't create more than ${MAX_DEFAULT_PARTNER_LINKS} default links for a group.`,
        });
      }

      return await tx.partnerGroupDefaultLink.create({
        data: {
          id: createId(),
          programId,
          groupId: group.id,
          domain,
          url,
        },
      });
    });

    waitUntil(
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/create-default-links`,
        body: {
          defaultLinkId: defaultLink.id,
          userId: session.user.id,
        },
      }),
    );

    return NextResponse.json(PartnerGroupDefaultLinkSchema.parse(defaultLink), {
      status: 201,
    });
  },
  {
    requiredPermissions: ["groups.write"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
