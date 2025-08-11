import z from "@/lib/zod";
import { getLinksQuerySchemaBase } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";

export async function getQrsCount({
  search,
  userId,
  workspaceId,
}: z.infer<typeof getLinksQuerySchemaBase> & {
  workspaceId?: string;
}) {
  const count = await prisma.qr.count({
    where: {
      archived: false, // Filter out archived QRs by default
      ...(workspaceId && { workspaceId }),
      ...(search && {
        OR: [
          // More efficient search - prioritize title search
          {
            title: { contains: search },
          },
          // Only search data field if title search might not be sufficient
          ...(search.length > 3 ? [{ data: { contains: search } }] : []),
        ],
      }),
      ...(userId && { userId }),
    },
  });

  return count;
}
