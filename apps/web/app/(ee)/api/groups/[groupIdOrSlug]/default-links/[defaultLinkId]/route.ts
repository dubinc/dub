import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  createOrUpdateDefaultLinkSchema,
  PartnerGroupDefaultLinkSchema,
} from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  constructURLFromUTMParams,
  deepEqual,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PATCH /api/groups/[groupIdOrSlug]/default-links/[defaultLinkId] - update a default link for a group
export const PATCH = withWorkspace(
  async ({ workspace, req, params }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { url } = createOrUpdateDefaultLinkSchema.parse(
      await parseRequestBody(req),
    );

    const group = await prisma.partnerGroup.findUniqueOrThrow({
      where: {
        id: params.groupIdOrSlug,
        programId,
      },
      include: {
        utmTemplate: true,
        partnerGroupDefaultLinks: {
          where: {
            id: params.defaultLinkId,
          },
        },
      },
    });

    if (group.partnerGroupDefaultLinks.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: `Default link ${params.defaultLinkId} not found for this group.`,
      });
    }

    const updatedDefaultLink = await prisma.partnerGroupDefaultLink.update({
      where: {
        id: group.partnerGroupDefaultLinks[0].id,
      },
      data: {
        url: group.utmTemplate
          ? constructURLFromUTMParams(url, extractUtmParams(group.utmTemplate))
          : url,
      },
    });

    const defaultLinkDiff = !deepEqual(
      group.partnerGroupDefaultLinks[0],
      updatedDefaultLink,
    );

    if (defaultLinkDiff) {
      waitUntil(
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/update-default-links`,
          body: {
            defaultLinkId: group.partnerGroupDefaultLinks[0].id,
          },
        }),
      );
    }

    return NextResponse.json(
      PartnerGroupDefaultLinkSchema.parse(updatedDefaultLink),
    );
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

// DELETE /api/groups/[groupIdOrSlug]/default-links/[defaultLinkId] - delete a default link for a group
export const DELETE = withWorkspace(
  async ({ workspace, params }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const [group, defaultLink] = await Promise.all([
      getGroupOrThrow({
        programId,
        groupId: params.groupIdOrSlug,
      }),

      prisma.partnerGroupDefaultLink.findUniqueOrThrow({
        where: {
          id: params.defaultLinkId,
        },
      }),
    ]);

    if (defaultLink.groupId !== group.id) {
      throw new DubApiError({
        code: "bad_request",
        message: `Default link ${params.defaultLinkId} not found for this group.`,
      });
    }

    await prisma.partnerGroupDefaultLink.delete({
      where: {
        id: defaultLink.id,
      },
    });

    return NextResponse.json({
      id: defaultLink.id,
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
