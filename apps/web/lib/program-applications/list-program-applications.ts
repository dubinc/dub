import { formatApplicationFormData } from "@/lib/partners/format-application-form-data";
import { prisma } from "@/lib/prisma";
import { buildSocialPlatformLookup } from "@/lib/social-utils";
import { getPartnerApplicationsQuerySchema } from "@/lib/zod/schemas/program-application";
import { ProgramEnrollmentStatus } from "@prisma/client";
import * as z from "zod/v4";
import { buildProgramApplicationWhere } from "./program-application-where";

type ListProgramApplicationsParams = z.infer<
  typeof getPartnerApplicationsQuerySchema
> & {
  programId: string;
};

export async function listProgramApplications({
  programId,
  groupId,
  country,
  status = ProgramEnrollmentStatus.pending,
  search,
  sortOrder = "desc",
  page = 1,
  pageSize,
}: ListProgramApplicationsParams) {
  const where = buildProgramApplicationWhere({
    programId,
    groupId,
    country,
    status,
    search,
  });

  const applications = await prisma.programApplication.findMany({
    where,
    include: {
      enrollment: {
        include: {
          partner: {
            include: {
              platforms: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: sortOrder,
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  return applications.flatMap((application) => {
    const enrollment = application.enrollment;

    if (!enrollment) {
      return [];
    }

    const applicationFormData = formatApplicationFormData(application).map(
      ({ title, value }) => ({
        label: title,
        value: value !== "" ? value : null,
      }),
    );

    const platformsByType = buildSocialPlatformLookup(
      enrollment.partner.platforms,
    );

    const platforms = (
      [
        "website",
        "youtube",
        "twitter",
        "linkedin",
        "instagram",
        "tiktok",
      ] as const
    ).flatMap((type) => {
      const platform = platformsByType[type];
      const identifier = application[type] ?? platform?.identifier;

      if (!identifier) {
        return [];
      }

      return [
        {
          type,
          identifier,
          verifiedAt:
            platform?.identifier === identifier
              ? platform.verifiedAt ?? null
              : null,
        },
      ];
    });

    return [
      {
        id: application.id,
        createdAt: application.createdAt,
        applicationFormData,
        partner: {
          ...enrollment.partner,
          name: application.name,
          email: application.email,
          country: application.country,
          groupId: application.groupId,
          status: enrollment.status,
          website: application.website,
          youtube: application.youtube,
          twitter: application.twitter,
          linkedin: application.linkedin,
          instagram: application.instagram,
          tiktok: application.tiktok,
          platforms,
        },
      },
    ];
  });
}
