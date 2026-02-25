import { getCustomersQuerySchemaExtended } from "@/lib/zod/schemas/customers";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import * as z from "zod/v4";

type GetCustomersInput = z.infer<typeof getCustomersQuerySchemaExtended> & {
  workspaceId: string;
};

export async function getCustomers(filters: GetCustomersInput) {
  const {
    customerIds,
    programId,
    partnerId,
    workspaceId,
    email,
    externalId,
    search,
    country,
    linkId,
    sortBy,
    sortOrder,
    page,
    pageSize,
    includeExpandedFields,
  } = filters;

  return await prisma.customer.findMany({
    where: {
      ...(customerIds
        ? {
            id: { in: customerIds },
          }
        : {}),
      ...(programId && {
        programId,
      }),
      ...(partnerId && {
        partnerId,
      }),
      projectId: workspaceId,
      ...(email
        ? { email }
        : externalId
          ? { externalId }
          : search
            ? search.includes("@")
              ? { email: search }
              : {
                  email: { search: sanitizeFullTextSearch(search) },
                  name: { search: sanitizeFullTextSearch(search) },
                }
            : {}),
      ...(country && {
        country,
      }),
      ...(linkId && {
        linkId,
      }),
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    ...(includeExpandedFields
      ? {
          include: {
            link: {
              select: {
                id: true,
                domain: true,
                key: true,
                shortLink: true,
                url: true,
                programId: true,
              },
            },
            programEnrollment: {
              include: {
                partner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                  },
                },
                discount: true,
              },
            },
          },
        }
      : {}),
  });
}
