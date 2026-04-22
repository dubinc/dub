import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { formatApplicationFormData } from "@/lib/partners/format-application-form-data";
import { polyfillSocialMediaFields } from "@/lib/social-utils";
import {
  getPartnerApplicationsQuerySchema,
  partnerApplicationSchema,
} from "@/lib/zod/schemas/program-application";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partners/applications - get all pending applications for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const { page = 1, pageSize } =
      getPartnerApplicationsQuerySchema.parse(searchParams);

    const programId = getDefaultProgramIdOrThrow(workspace);

    const applications = await prisma.programEnrollment.findMany({
      where: {
        programId,
        status: "pending",
        application: {
          isNot: null,
        },
      },
      include: {
        application: true,
        partner: {
          include: {
            platforms: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    const result = applications.map(
      ({ partner, application, ...programEnrollment }) => {
        const applicationFormData = formatApplicationFormData(application!).map(
          ({ title, value }) => ({
            label: title,
            value: value !== "" ? value : null,
          }),
        );

        return {
          id: application!.id,
          createdAt: application!.createdAt,
          applicationFormData,
          partner: {
            ...partner,
            ...polyfillSocialMediaFields(partner.platforms),
            status: programEnrollment.status,
            groupId: programEnrollment.groupId,
          },
        };
      },
    );

    return NextResponse.json(z.array(partnerApplicationSchema).parse(result));
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
