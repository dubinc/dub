import { prisma } from "@/lib/prisma";
import { getProgramApplicationsCountQuerySchema } from "@/lib/zod/schemas/program-application";
import * as z from "zod/v4";
import { buildProgramApplicationWhere } from "./program-application-where";

type CountProgramApplicationsParams = z.infer<
  typeof getProgramApplicationsCountQuerySchema
> & {
  programId: string;
};

export async function countProgramApplications({
  programId,
  groupId,
  country,
  status,
  search,
  groupBy,
}: CountProgramApplicationsParams) {
  const where = buildProgramApplicationWhere({
    programId,
    groupId: groupBy === "groupId" ? undefined : groupId,
    country: groupBy === "country" ? undefined : country,
    status,
    search,
  });

  if (groupBy === "country") {
    return prisma.programApplication.groupBy({
      by: ["country"],
      where,
      _count: true,
      orderBy: {
        _count: {
          country: "desc",
        },
      },
    });
  }

  if (groupBy === "groupId") {
    return prisma.programApplication.groupBy({
      by: ["groupId"],
      where,
      _count: true,
      orderBy: {
        _count: {
          groupId: "desc",
        },
      },
    });
  }

  return prisma.programApplication.count({
    where,
  });
}
