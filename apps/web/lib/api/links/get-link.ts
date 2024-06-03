import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { Link } from "@prisma/client";
import { DubApiError } from "../errors";

export const getLinkSchema = z.object({
  workspaceId: z.string().optional(),
  linkId: z.string().optional(),
  externalId: z.string().optional(),
  domain: z.string().optional(),
  key: z.string().optional(),
});

// Find link
export const getLink = async (params: z.infer<typeof getLinkSchema>) => {
  const { workspaceId, domain, key, externalId } = params;
  const linkId = params.linkId || params.externalId || undefined;

  let link: Link | null = null;

  // Get link by linkId or externalId
  if (linkId) {
    link = await prisma.link.findUnique({
      where: {
        ...(linkId.startsWith("ext_") && workspaceId
          ? {
              projectId_externalId: {
                projectId: workspaceId,
                externalId: linkId.replace("ext_", ""),
              },
            }
          : { id: linkId }),
      },
    });
  }

  // Get link by domain and key
  else if (domain && key && key != "_root") {
    link = await prisma.link.findUnique({
      where: {
        domain_key: {
          domain,
          key,
        },
      },
    });
  }

  console.log("Link found for deletion", link);

  if (!link) {
    if (externalId && !externalId.startsWith("ext_")) {
      throw new DubApiError({
        code: "bad_request",
        message: "Invalid externalId. Did you forget to prefix it with `ext_`?",
      });
    }

    throw new DubApiError({
      code: "not_found",
      message: "Link not found.",
    });
  }

  if (link.projectId !== workspaceId) {
    throw new DubApiError({
      code: "unauthorized",
      message: "You do not have permission to access this link.",
    });
  }

  return link;
};
