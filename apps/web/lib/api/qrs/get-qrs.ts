import z from "@/lib/zod";
import { getLinksQuerySchemaBase } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";

export async function getQrs({
  search,
  sort, // Deprecated
  sortBy,
  sortOrder,
  page,
  pageSize,
  userId,
}: z.infer<typeof getLinksQuerySchemaBase>) {
  // support legacy sort param
  if (sort && sort !== "createdAt") {
    sortBy = sort;
  }

  // Map qrs sort options to database fields
  const sortMapping = {
    lastScanned: "lastClicked",
    totalScans: "clicks",
  };

  const actualSortBy = sortMapping[sortBy] || sortBy;

  const qrs = await prisma.qr.findMany({
    where: {
      ...(search && {
        OR: [
          {
            data: { contains: search },
          },
          {
            title: { contains: search },
          },
        ],
      }),
      ...(userId && { userId }),
    },
    include: {
      user: true,
      link: true,
    },
    orderBy: {
      ...(["clicks", "lastClicked"].includes(actualSortBy)
        ? {
            link: {
              [actualSortBy]: sortOrder,
            },
          }
        : {
            [actualSortBy || "createdAt"]: sortOrder,
          }),
    },
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  return qrs;
}
