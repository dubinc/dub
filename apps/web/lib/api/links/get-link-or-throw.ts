import { prisma } from "@dub/prisma";
import { Link } from "@dub/prisma/client";
import { DubApiError } from "../errors";
import { prefixWorkspaceId } from "../workspace-id";
import {
  decodeLinkIfCaseSensitive,
  encodeKeyIfCaseSensitive,
} from "./case-sensitivity";

interface GetLinkParams {
  workspaceId: string;
  linkId?: string;
  externalId?: string;
  domain?: string;
  key?: string;
}

// Get link or throw error if not found or doesn't belong to workspace
export const getLinkOrThrow = async (params: GetLinkParams) => {
  let { workspaceId, domain, key, externalId } = params;
  let link: Link | null = null;

  const linkId = params.linkId || params.externalId || undefined;

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
    key = encodeKeyIfCaseSensitive({
      domain,
      key,
    });

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
      message: `Link does not belong to workspace ${prefixWorkspaceId(workspaceId)}.`,
    });
  }

  return decodeLinkIfCaseSensitive(link);
};
