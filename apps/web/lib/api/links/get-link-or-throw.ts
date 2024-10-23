import { prisma } from "@dub/prisma";
import { WorkspaceWithUsers } from "@/lib/types";
import { Link } from "@prisma/client";
import { DubApiError } from "../errors";

interface GetLinkParams {
  workspace: WorkspaceWithUsers;
  linkId?: string;
  externalId?: string;
  domain?: string;
  key?: string;
}

// Find link
export const getLinkOrThrow = async (params: GetLinkParams) => {
  let { workspace, domain, key, externalId } = params;
  let link: Link | null = null;

  const linkId = params.linkId || params.externalId || undefined;
  const { id: workspaceId } = workspace;

  if (domain && (!key || key === "")) {
    key = "_root";
  }

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
      message: `Link does not belong to workspace ws_${workspace.id}.`,
    });
  }

  return link;
};
