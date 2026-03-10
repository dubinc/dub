import { getCustomersQuerySchemaExtended } from "@/lib/zod/schemas/customers";
import { prisma, sanitizeFullTextSearch } from "@dub/prisma";
import * as z from "zod/v4";
import { DubApiError } from "../../api/errors";
import { buildPaginationQuery } from "../../api/pagination";

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
    includeExpandedFields,
    startingAfter,
    endingBefore,
  } = filters;

  const paginationQuery = buildPaginationQuery(filters);

  // Validate the provided cursor ID
  const cursorId = startingAfter || endingBefore;

  if (cursorId) {
    const cursorRecord = await prisma.customer.findUnique({
      where: {
        id: cursorId,
      },
      select: {
        id: true,
      },
    });

    if (!cursorRecord) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Invalid cursor: the provided ID does not exist.",
      });
    }
  }

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
    ...paginationQuery,
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
