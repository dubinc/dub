import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  createOrUpdateDefaultLinkSchema,
  PartnerGroupDefaultLinkSchema,
} from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, deepEqual } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PATCH /api/groups/[groupIdOrSlug]/default-links/[defaultLinkId] - update a default link for a group
export const PATCH = withWorkspace(
  async ({ workspace, req, params }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { domain, url } = createOrUpdateDefaultLinkSchema.parse(
      await parseRequestBody(req),
    );

    const [group, defaultLink, domainRecord] = await Promise.all([
      getGroupOrThrow({
        programId,
        groupId: params.groupIdOrSlug,
      }),

      prisma.partnerGroupDefaultLink.findUniqueOrThrow({
        where: {
          id: params.defaultLinkId,
        },
      }),

      prisma.domain.findUniqueOrThrow({
        where: {
          slug: domain,
        },
      }),
    ]);

    if (domainRecord.projectId !== workspace.id) {
      throw new DubApiError({
        code: "forbidden",
        message: `Domain ${domain} does not belong to your workspace ${workspace.name}.`,
      });
    }

    if (defaultLink.groupId !== group.id) {
      throw new DubApiError({
        code: "bad_request",
        message: `Default link ${params.defaultLinkId} not found for this group.`,
      });
    }

    const updatedDefaultLink = await prisma.partnerGroupDefaultLink.update({
      where: {
        id: defaultLink.id,
      },
      data: {
        domain,
        url,
      },
    });

    const defaultLinkDiff = !deepEqual(defaultLink, updatedDefaultLink);

    if (defaultLinkDiff) {
      waitUntil(
        qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/update-default-links`,
          body: {
            defaultLinkId: defaultLink.id,
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
