import { CreatePartnerProps, ProgramProps, WorkspaceProps } from "@/lib/types";
import { defaultPartnerLinkSchema } from "@/lib/zod/schemas/groups";
import { isFulfilled, nanoid } from "@dub/utils";
import { PartnerGroup } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { DubApiError } from "../errors";
import { bulkCreateLinks } from "../links";
import { linkCache } from "../links/cache";
import {
  derivePartnerLinkKey,
  generatePartnerLink,
} from "./generate-partner-link";

interface CreateDefaultPartnerLinksInput {
  workspace: Pick<WorkspaceProps, "id" | "plan" | "webhookEnabled">;
  program: Pick<ProgramProps, "defaultFolderId" | "id">;
  partner: Pick<
    CreatePartnerProps,
    "name" | "email" | "username" | "tenantId"
  > & { id: string };
  group: Pick<PartnerGroup, "id" | "defaultLinks">;
  link?: CreatePartnerProps["linkProps"];
  userId: string;
}

// Create default partner links based on group defaults
export async function createDefaultPartnerLinks({
  workspace,
  program,
  partner,
  group,
  link,
  userId,
}: CreateDefaultPartnerLinksInput) {
  const result = z
    .array(defaultPartnerLinkSchema)
    .safeParse(group.defaultLinks);

  if (!result.success) {
    throw new DubApiError({
      code: "bad_request",
      message: `Invalid defaultLinks settings for the group ${group.id}.`,
    });
  }

  const defaultLinks = result.data;
  const hasMoreThanOneLink = defaultLinks.length > 1;

  const processedLinks = (
    await Promise.allSettled(
      defaultLinks.map(({ domain, url }) => {
        let key = derivePartnerLinkKey({
          username: partner.username,
          name: partner.name,
          email: partner.email,
        });

        key = !hasMoreThanOneLink ? key : `${key}-${nanoid(4).toLowerCase()}`;

        return generatePartnerLink({
          workspace,
          program,
          partner,
          link: {
            ...link,
            domain,
            url,
            key,
          },
          userId,
        });
      }),
    )
  )
    .filter(isFulfilled)
    .map(({ value }) => value);

  const createdLinks = await bulkCreateLinks({
    links: processedLinks,
    skipRedisCache: true,
  });

  waitUntil(linkCache.expireMany(createdLinks));

  return createdLinks;
}
