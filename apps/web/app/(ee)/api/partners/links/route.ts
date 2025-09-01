import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { validatePartnerLinkUrl } from "@/lib/api/links/validate-partner-link-url";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import {
  createPartnerLinkSchema,
  retrievePartnerLinksSchema,
} from "@/lib/zod/schemas/partners";
import { ProgramPartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partners/links - get the partner links
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, tenantId } =
      retrievePartnerLinksSchema.parse(searchParams);

    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: partnerId
        ? {
            partnerId_programId: {
              partnerId,
              programId,
            },
          }
        : {
            tenantId_programId: {
              tenantId: tenantId as string,
              programId,
            },
          },
      select: {
        links: true,
      },
    });

    if (!programEnrollment) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });
    }

    const { links } = programEnrollment;

    return NextResponse.json(z.array(ProgramPartnerLinkSchema).parse(links));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);

// POST /api/partners/links - create a link for a partner
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partnerId, tenantId, url, key, linkProps } =
      createPartnerLinkSchema.parse(await parseRequestBody(req));

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (!program.domain || !program.url) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You need to set a domain and url for this program before creating a link.",
      });
    }

    if (!partnerId && !tenantId) {
      throw new DubApiError({
        code: "bad_request",
        message: "You must provide a partnerId or tenantId.",
      });
    }

    const partner = await prisma.programEnrollment.findUnique({
      where: partnerId
        ? { partnerId_programId: { partnerId, programId } }
        : { tenantId_programId: { tenantId: tenantId!, programId } },
      include: {
        partnerGroup: {
          include: {
            utmTemplate: true,
          },
        },
      },
    });

    if (!partner) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });
    }

    validatePartnerLinkUrl({ group: partner.partnerGroup, url });

    const utmTemplate = partner.partnerGroup?.utmTemplate;

    const { link, error, code } = await processLink({
      payload: {
        ...linkProps,
        domain: program.domain,
        key: key || undefined,
        url: url || program.url,
        programId: program.id,
        tenantId: partner.tenantId,
        partnerId: partner.partnerId,
        folderId: program.defaultFolderId,
        trackConversion: true,
        utm_source: linkProps?.utm_source || utmTemplate?.utm_source,
        utm_medium: linkProps?.utm_medium || utmTemplate?.utm_medium,
        utm_campaign: linkProps?.utm_campaign || utmTemplate?.utm_campaign,
        utm_term: linkProps?.utm_term || utmTemplate?.utm_term,
        utm_content: linkProps?.utm_content || utmTemplate?.utm_content,
        ref: linkProps?.ref || utmTemplate?.ref,
      },
      workspace,
      userId: session.user.id,
      skipProgramChecks: true, // skip this cause we've already validated the program above
    });

    if (error != null) {
      throw new DubApiError({
        code: code as ErrorCodes,
        message: error,
      });
    }

    const partnerLink = await createLink({
      ...link,
      workspace,
      discount: partner.discount,
    });

    waitUntil(
      sendWorkspaceWebhook({
        trigger: "link.created",
        workspace,
        data: linkEventSchema.parse(partnerLink),
      }),
    );

    return NextResponse.json(partnerLink, { status: 201 });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
