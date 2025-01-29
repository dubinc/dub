import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { enrollPartner } from "@/lib/api/partners/enroll-partner";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { checkIfKeyExists } from "@/lib/planetscale";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema } from "@/lib/zod/schemas/links";
import {
  createPartnerSchema,
  EnrolledPartnerSchema,
  partnersQuerySchema,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partners - get all partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { programId } = searchParams;

    if (!programId) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "Program ID not found. Did you forget to include a `programId` query parameter?",
      });
    }

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const { status, country, search, ids, page, pageSize, sortBy, sortOrder } =
      partnersQuerySchema.parse(searchParams);

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
        ...(status && { status }),
        ...(country && { partner: { country } }),
        ...(search && { partner: { name: { contains: search } } }),
        ...(ids && {
          partnerId: {
            in: ids,
          },
        }),
      },
      include: {
        partner: true,
        link: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy:
        sortBy === "createdAt"
          ? { [sortBy]: sortOrder }
          : {
              link: {
                [sortBy === "earnings" ? "saleAmount" : sortBy]: sortOrder,
              },
            },
    });

    const partners = programEnrollments.map((enrollment) => ({
      ...enrollment.partner,
      ...enrollment,
      id: enrollment.partnerId,
      earnings:
        ((program.commissionType === "percentage"
          ? enrollment.link?.saleAmount
          : enrollment.link?.sales) ?? 0) *
        (program.commissionAmount / 100),
    }));

    return NextResponse.json(z.array(EnrolledPartnerSchema).parse(partners));
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "enterprise",
    ],
  },
);

// POST /api/partners - add a partner for a program
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const { programId, name, email, image, username, linkProps } =
      createPartnerSchema.parse(await parseRequestBody(req));

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    if (!program.domain || !program.url) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You need to set a domain and url for this program before creating a partner.",
      });
    }

    const linkExists = await checkIfKeyExists(program.domain, username);

    if (linkExists) {
      throw new DubApiError({
        code: "conflict",
        message: "This username is already in use. Choose a different one.",
      });
    }

    const { link, error, code } = await processLink({
      payload: {
        ...linkProps,
        domain: program.domain,
        url: program.url,
        key: username,
        programId,
        trackConversion: true,
      },
      workspace,
      userId: session.user.id,
    });

    if (error != null) {
      throw new DubApiError({
        code: code as ErrorCodes,
        message: error,
      });
    }

    const partnerLink = await createLink(link);

    waitUntil(
      sendWorkspaceWebhook({
        trigger: "link.created",
        workspace,
        data: linkEventSchema.parse(partnerLink),
      }),
    );

    const createdPartner = await enrollPartner({
      programId,
      linkId: partnerLink.id,
      partner: {
        name,
        email,
        image,
      },
    });

    const partner = EnrolledPartnerSchema.parse({
      ...createdPartner,
      link: partnerLink,
      status: "approved",
      commissionAmount: null,
      earnings: 0,
    });

    return NextResponse.json(partner, {
      status: 201,
    });
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "enterprise",
    ],
  },
);
