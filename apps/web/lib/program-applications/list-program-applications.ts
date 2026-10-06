import { formatApplicationFormData } from "@/lib/partners/format-application-form-data";
import { prisma } from "@/lib/prisma";
import { polyfillSocialMediaFields } from "@/lib/social-utils";
import { getProgramApplicationsQuerySchema } from "@/lib/zod/schemas/program-application";
import { Prisma, ProgramApplicationStatus } from "@prisma/client";
import * as z from "zod/v4";
import { buildProgramApplicationWhere } from "./program-application-where";

type ListProgramApplicationsParams = z.infer<
  typeof getProgramApplicationsQuerySchema
> & {
  programId: string;
};

const programApplicationInclude = {
  partner: {
    include: {
      platforms: true,
    },
  },
} satisfies Prisma.ProgramApplicationInclude;

type ProgramApplicationWithPartner = Prisma.ProgramApplicationGetPayload<{
  include: typeof programApplicationInclude;
}>;

export async function listProgramApplications({
  programId,
  groupId,
  country,
  status = ProgramApplicationStatus.pending,
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
    include: programApplicationInclude,
    orderBy: {
      createdAt: sortOrder,
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  return applications.flatMap(
    (application) => transformApplication(application) ?? [],
  );
}

function transformApplication(application: ProgramApplicationWithPartner) {
  const partner = application.partner;

  if (!partner) {
    return null;
  }

  const applicationFormData = formatApplicationFormData(application).map(
    ({ title, value }) => ({
      label: title,
      value: value !== "" ? value : null,
    }),
  );

  return {
    id: application.id,
    createdAt: application.createdAt,
    applicationFormData,
    partner: {
      ...partner,
      groupId: application.groupId,
      status: application.status,
      ...polyfillSocialMediaFields(partner.platforms),
    },
  };
}
