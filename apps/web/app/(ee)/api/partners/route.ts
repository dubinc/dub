import { createAndEnrollPartner } from "@/lib/api/partners/create-and-enroll-partner";
import { createPartnerLink } from "@/lib/api/partners/create-partner-link";
import { getPartners } from "@/lib/api/partners/get-partners";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  createPartnerSchema,
  EnrolledPartnerSchemaExtended,
  partnersQuerySchema,
} from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partners - get all partners for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const partners = await getPartners({
      ...partnersQuerySchema.parse(searchParams),
      workspaceId: workspace.id,
      programId,
    });

    return NextResponse.json(
      z.array(EnrolledPartnerSchemaExtended).parse(partners),
    );
  },
  {
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

// POST /api/partners - add a partner for a program
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const {
      name,
      email,
      username,
      image = null,
      country = null,
      description = null,
      tenantId,
      linkProps,
    } = createPartnerSchema.parse(await parseRequestBody(req));

    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const partnerLink = await createPartnerLink({
      workspace,
      program,
      partner: {
        name,
        email,
        username,
        tenantId,
        linkProps,
      },
      userId: session.user.id,
    });

    const enrolledPartner = await createAndEnrollPartner({
      program,
      link: partnerLink,
      workspace,
      partner: {
        name,
        email,
        image,
        country,
        description,
      },
      tenantId,
    });

    return NextResponse.json(enrolledPartner, {
      status: 201,
    });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
