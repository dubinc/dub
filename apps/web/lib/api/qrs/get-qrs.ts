import z from "@/lib/zod";
import { getLinksQuerySchemaBase } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";
import { Prisma } from "@prisma/client";

export async function getQrs(
  {
    search,
    sort, // Deprecated
    sortBy,
    sortOrder,
    page,
    pageSize,
    userId,
  }: z.infer<typeof getLinksQuerySchemaBase>,
  {
    includeUser = false,
    includeFile = false,
  }: {
    includeUser?: boolean;
    includeFile?: boolean;
  } = {}
) {
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

  // For sorting by link fields, we need to handle it differently
  const needsLinkJoin = ["clicks", "lastClicked"].includes(actualSortBy);

  const dbStartTime = performance.now();

  const whereOptions = {
    ...(search && {
      OR: [
        // More efficient search - only search title for better performance
        // data field is LongText and expensive to search
        {
          title: { contains: search },
        },
        // Only search data field if title search might not be sufficient
        ...(search.length > 2 ? [{ data: { contains: search } }] : []),
      ],
    }),
    ...(userId && { userId }),
  }

  const selectOptions = {
    id: true,
    data: true,
    qrType: true,
    title: true,
    description: true,
    archived: true,
    styles: true,
    frameOptions: true,
    logoOptions: true,
    linkId: true,
    fileId: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    // Conditionally include relations
    ...(includeUser && {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    }),
    ...(includeFile && {
      file: {
        select: {
          id: true,
          name: true,
          size: true,
        },
      },
    }),
    // Always include link for sorting and basic info, but select only needed fields
    link: {
      select: {
        id: true,
        url: true,
        domain: true,
        shortLink: true,
        key: true,
        clicks: true,
        createdAt: true,
      },
    },
  }

  const queryOptions: Prisma.QrFindManyArgs = {
    where: whereOptions,
    select: selectOptions,
  };
  
  if (sortBy !== "type") {
    queryOptions.orderBy = needsLinkJoin
      ? { link: { [actualSortBy]: sortOrder } } 
      : { [actualSortBy || "createdAt"]: sortOrder };
    queryOptions.take = pageSize;
    queryOptions.skip = (page - 1) * pageSize;
  }

  const allQrs = await prisma.qr.findMany(queryOptions);

  const qrs =
  sortBy === "type"
    ? allQrs
        .sort((a, b) => b.qrType.localeCompare(a.qrType))
        .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
    : allQrs;

  const dbEndTime = performance.now();
  const dbExecutionTime = Math.round(dbEndTime - dbStartTime);
  
  console.log(`🗄️  Database Query Performance: ${dbExecutionTime}ms`);
  console.log(`📋 Query details:`, {
    userId,
    search: search ? `"${search}"` : 'none',
    sortBy: actualSortBy,
    page,
    pageSize,
    resultsCount: qrs.length
  });

  return qrs;
}
