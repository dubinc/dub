import { prisma } from "@dub/prisma";
import { getDomainWithoutWWW, isValidUrl } from "@dub/utils";
import { getUrlFromString } from "@dub/utils/src/functions/get-url-from-string";
import { UTMTags } from "@dub/utils/src/internals";
import { verifyFolderAccess } from "../folders/verify-folder-access";
import { isBlacklistedDomain } from "./is-blacklisted-domain";
import { getPartnerEnrollmentInfo } from "@/lib/planetscale/get-partner-enrollment-info";

import { ProcessedLinkProps } from "@/lib/types";
import { parseDateTime } from "@/lib/utils";
import { createLinkBodySchemaAsync } from "@/lib/zod/schemas/links";
import * as z from "zod/v4";

export async function processLink({
  payload,
  workspace,
  userId,
  skipProgramChecks = false,
}: {
  payload: z.infer<typeof createLinkBodySchemaAsync>;
  workspace?: {
    id: string;
    plan: string;
  };
  userId?: string;
  skipProgramChecks?: boolean;
}): Promise<{
  link: ProcessedLinkProps;
  error: string | null;
  code: string | null;
}> {
  let {
    domain,
    key,
    url,
    expiresAt,
    expiredUrl,
    testVariants,
    testStartedAt,
    testCompletedAt,
    tagIds,
    tagNames,
    folderId,
    proxy,
    image,
    webhookIds,
    programId,
    tenantId,
    partnerId,
  } = payload;

  url = getUrlFromString(url);

  if (!isValidUrl(url)) {
    return {
      link: payload,
      error: "Invalid destination URL.",
      code: "unprocessable_entity",
    };
  }

  const isMalicious = await maliciousLinkCheck(url);
  if (isMalicious) {
    return {
      link: payload,
      error: "The destination URL is flagged as malicious.",
      code: "unprocessable_entity",
    };
  }

  // default to random key if not provided
  if (!key) {
    key = "";
  }

  if (key.length > 0) {
    const linkExists = await prisma.link.findFirst({
      where: {
        domain,
        key,
      },
    });

    if (linkExists) {
      return {
        link: payload,
        error: "A link with this domain and key already exists.",
        code: "conflict",
      };
    }
  }

  if (payload.externalId) {
    const linkExists = await prisma.link.findFirst({
      where: {
        projectId: workspace?.id,
        externalId: payload.externalId,
      },
    });

    if (linkExists) {
      return {
        link: payload,
        error: "A link with this externalId already exists in this workspace.",
        code: "conflict",
      };
    }
  }

    // only perform tag validity checks if:
    // - not bulk creation (we do that check separately in the route itself)
    // - tagIds are present
    if (tagIds && tagIds.length > 0) {
      if (!workspace) {
        return {
          link: payload,
          error:
            "Workspace not found. You can't add tags to a link without a workspace.",
          code: "not_found",
        };
      }
      const tags = await prisma.tag.findMany({
        select: {
          id: true,
        },
        where: { projectId: workspace.id, id: { in: tagIds } },
      });

      if (tags.length !== tagIds.length) {
        return {
          link: payload,
          error:
            "Invalid tagIds detected: " +
            tagIds
              .filter(
                (tagId) => tags.find(({ id }) => tagId === id) === undefined,
              )
              .join(", "),
          code: "unprocessable_entity",
        };
      }
    }

    if (tagNames && tagNames.length > 0) {
      if (!workspace) {
        return {
          link: payload,
          error:
            "Workspace not found. You can't add tags to a link without a workspace.",
          code: "not_found",
        };
      }

      const tags = await prisma.tag.findMany({
        where: {
          projectId: workspace.id,
          name: {
            in: tagNames,
          },
        },
      });

      if (tags.length !== tagNames.length) {
        return {
          link: payload,
          error:
            "Invalid tagNames detected: " +
            tagNames
              .filter(
                (tagName) =>
                  tags.find(({ name }) => tagName === name) === undefined,
              )
              .join(", "),
          code: "unprocessable_entity",
        };
      }
    }

    // only perform folder validity checks if:
    // - not bulk creation (we do that check separately in the route itself)
    // - folderId is present
    if (folderId) {
      if (!workspace || !userId) {
        return {
          link: payload,
          error:
            "Workspace or user ID not found. You can't add a folder to a link without a workspace or user ID.",
          code: "not_found",
        };
      }

      if (workspace.plan === "free") {
        return {
          link: payload,
          error: "You can't add a folder to a link on a free plan.",
          code: "forbidden",
        };
      }

      try {
        await verifyFolderAccess({
          workspace,
          userId,
          folderId,
          requiredPermission: "folders.links.write",
        });
      } catch (error) {
        return {
          link: payload,
          error: error.message,
          code: error.code,
        };
      }
    }

    let defaultProgramFolderId: string | null = null;

    // Program validity checks
    if (programId && !skipProgramChecks) {
      const program = await prisma.program.findUnique({
        where: { id: programId },
        select: {
          workspaceId: true,
          defaultFolderId: true,
          ...(!partnerId && tenantId
            ? {
                partners: {
                  where: {
                    tenantId,
                  },
                },
              }
            : {}),
        },
      });

      if (!program || program.workspaceId !== workspace?.id) {
        return {
          link: payload,
          error: "Invalid programId detected.",
          code: "unprocessable_entity",
        };
      }

      defaultProgramFolderId = program.defaultFolderId;

      if (!partnerId && tenantId) {
        // @ts-ignore
        const partner = program.partners?.[0];
        if (partner) {
          partnerId = partner.id;
        } else {
          const partnerInfo = await getPartnerEnrollmentInfo({
            programId,
            tenantId,
          });
          if (partnerInfo?.partnerId) {
            partnerId = partnerInfo.partnerId;
          }
        }
      }
    }

    // Webhook validity checks
    if (webhookIds && webhookIds.length > 0) {
      if (workspace?.plan === "free" || workspace?.plan === "pro") {
        return {
          link: payload,
          error:
            "You can only use webhooks on a Business plan and above. Upgrade to Business to use this feature.",
          code: "forbidden",
        };
      }

      webhookIds = [...new Set(webhookIds)];

      const webhooks = await prisma.webhook.findMany({
        select: {
          id: true,
        },
        where: { projectId: workspace?.id, id: { in: webhookIds } },
      });

      if (webhooks.length !== webhookIds.length) {
        const invalidWebhookIds = webhookIds.filter(
          (webhookId) =>
            webhooks.find(({ id }) => webhookId === id) === undefined,
        );

        return {
          link: payload,
          error: "Invalid webhookIds detected: " + invalidWebhookIds.join(", "),
          code: "unprocessable_entity",
        };
      }
    }

  // custom social media image checks (see if R2 is configured)
  if (proxy && !process.env.STORAGE_SECRET_ACCESS_KEY) {
    return {
      link: payload,
      error: "Missing storage access key.",
      code: "bad_request",
    };
  }

  // expire date checks
  if (expiresAt) {
    const datetime = parseDateTime(expiresAt);

    if (!datetime) {
      return {
        link: payload,
        error: "Invalid expiration date.",
        code: "unprocessable_entity",
      };
    }

    expiresAt = datetime;

    if (expiredUrl) {
      expiredUrl = getUrlFromString(expiredUrl);

      if (!isValidUrl(expiredUrl)) {
        return {
          link: payload,
          error: "Invalid expired URL.",
          code: "unprocessable_entity",
        };
      }
    }
  }

  if (testCompletedAt) {
    const datetime = parseDateTime(testCompletedAt);

    if (!datetime) {
      return {
        link: payload,
        error: "Invalid test completion date.",
        code: "unprocessable_entity",
      };
    }

    testCompletedAt = datetime;
  }

  // remove polyfill attributes from payload
  delete payload["shortLink"];
  delete payload["qrCode"];
  delete payload["keyLength"];
  delete payload["prefix"];
  UTMTags.forEach((tag) => {
    delete payload[tag];
  });

  return {
    link: {
      ...payload,
      domain,
      key,
      // we're redefining these fields because they're processed in the function
      url,
      expiresAt,
      expiredUrl,
      testVariants,
      testCompletedAt,
      // partnerId derived from payload or program enrollment
      partnerId: partnerId || null,
      // make sure projectId is set to the current workspace
      projectId: workspace?.id || null,
      // if userId is passed, set it (we don't change the userId if it's already set, e.g. when editing a link)
      ...(userId && {
        userId,
      }),
      ...(webhookIds && {
        webhookIds,
      }),
      folderId: folderId || defaultProgramFolderId,
    },
    error: null,
    code: null,
  };
}

async function maliciousLinkCheck(url: string) {
  const domain = getDomainWithoutWWW(url);

  if (!domain) {
    return false;
  }

  const domainBlacklisted = await isBlacklistedDomain(domain);
  if (domainBlacklisted === true) {
    return true;
  }

  return false;
}
