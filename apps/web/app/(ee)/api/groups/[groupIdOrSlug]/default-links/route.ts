import { createId } from "@/lib/api/create-id";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  createOrUpdateDefaultLinkSchema,
  MAX_DEFAULT_LINKS_PER_GROUP,
  PartnerGroupDefaultLinkSchema,
} from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, constructURLFromUTMParams } from "@dub/utils";
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

    const [group, domainRecord] = await Promise.all([
      prisma.partnerGroup.findUniqueOrThrow({
        where: {
          id: params.groupIdOrSlug,
          programId,
        },
        include: {
          program: true,
          utmTemplate: true,
        },
      }),

      getDomainOrThrow({
        workspace,
        domain,
      }),
    ]);

    // shouldn't happen but just in case
    if (!group.program.domain) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This program needs a domain set before creating a default link.",
      });
    }

    if (!domainRecord.verified) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message:
          "This domain is not verified. Please verify it before using it for partner links.",
      });
    }

    // Domain change detected, we should do the following
    // - Update the program's domain
    // - Update all default links across groups to use the new domain
    // - Update all partner links to use the new domain
    if (domain !== group.program.domain) {
      // TODO
      // Do this via a cron job
    }

    try {
      const defaultLink = await prisma.$transaction(async (tx) => {
        const count = await tx.partnerGroupDefaultLink.count({
          where: {
            groupId: group.id,
          },
        });

        if (count >= MAX_DEFAULT_LINKS_PER_GROUP) {
          throw new DubApiError({
            code: "bad_request",
            message: `You can't create more than ${MAX_DEFAULT_LINKS_PER_GROUP} default links for a group.`,
          });
        }

        return await tx.partnerGroupDefaultLink.create({
          data: {
            id: createId({ prefix: "pgdl_" }),
            programId: group.programId,
            groupId: group.id,
            domain,
            url: group.utmTemplate
              ? constructURLFromUTMParams(
                  url,
                  extractUtmParams(group.utmTemplate),
                )
              : url,
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

      return NextResponse.json(
        PartnerGroupDefaultLinkSchema.parse(defaultLink),
        {
          status: 201,
        },
      );
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "A default link with this URL already exists.",
        });
      }

      throw new DubApiError({
        code: "unprocessable_entity",
        message: error.message,
      });
    }
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
