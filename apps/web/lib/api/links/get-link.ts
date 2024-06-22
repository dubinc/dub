import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { Link } from "@prisma/client";
import { DubApiError } from "../errors";

interface GetLinkParams {
  workspace: WorkspaceProps;
  linkId?: string;
  externalId?: string;
  domain?: string;
  key?: string;
}

// Find link
export const getLink = async (params: GetLinkParams) => {
  const { workspace, domain, key, externalId } = params;
  const linkId = params.linkId || params.externalId || undefined;

  // if (!linkId || !externalId || !domain || !key) {
  //   return null;
  // }

  const { id: workspaceId } = workspace;
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
  else if (domain && key) {
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

  console.log("Link found:", link);

  return link;
};
