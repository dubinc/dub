import * as z from "zod/v4";
import { DubApiError } from "../api/errors";
import { buildPaginationQuery } from "../api/pagination";
import { prisma } from "../prisma";
import { listPartnerTagsQuerySchema } from "../zod/schemas/partner-tags";

type ListPartnerTagsInput = z.infer<typeof listPartnerTagsQuerySchema> & {
  programId: string;
};

export async function listPartnerTags({
  sortOrder,
  pageSize,
  startingAfter,
  endingBefore,
  ids,
  search,
  programId,
}: ListPartnerTagsInput) {
  const paginationQuery = buildPaginationQuery({
    pageSize,
    startingAfter,
    endingBefore,
    sortBy: "createdAt",
    sortOrder,
  });

  const cursorId = startingAfter || endingBefore;

  if (cursorId) {
    const partnerTag = await prisma.partnerTag.findUnique({
      where: {
        id: cursorId,
      },
      select: {
        programId: true,
      },
    });

    if (!partnerTag || partnerTag.programId !== programId) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Invalid cursor: the provided ID does not exist.",
      });
    }
  }

  const partnerTags = await prisma.partnerTag.findMany({
    where: {
      programId,
      ...(search && {
        name: {
          contains: search,
        },
      }),
      ...(ids && {
        id: {
          in: ids,
        },
      }),
    },
    select: {
      id: true,
      name: true,
    },
    ...paginationQuery,
    take: endingBefore ? -(pageSize + 1) : pageSize + 1,
  });

  const hasMore = partnerTags.length > pageSize;

  const data = hasMore
    ? endingBefore
      ? partnerTags.slice(1)
      : partnerTags.slice(0, pageSize)
    : partnerTags;

  const nextCursor = hasMore
    ? endingBefore
      ? data[0].id
      : data[data.length - 1].id
    : null;

  return {
    hasMore,
    nextCursor,
    data,
  };
}
