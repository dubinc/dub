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
export const getLink = async ({
  workspaceId,
  linkId,
  externalId,
  domain,
  key,
}: z.infer<typeof getLinkSchema>) => {
  let link: Link | null = null;

  // Get link by linkId
  if (linkId) {
    link = await prisma.link.findUnique({
      where: { id: linkId },
    });
  }

  // Get link by externalId
  else if (externalId && workspaceId) {
    link = await prisma.link.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspaceId,
          externalId: externalId.replace("ext_", ""),
        },
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

  // console.log("Found link: ", link);

  return link;
};
