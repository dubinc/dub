import {
  CreatePartnerProps,
  ProgramProps,
  UtmTemplateProps,
  WorkspaceProps,
} from "@/lib/types";
import { PartnerGroupDefaultLink } from "@dub/prisma/client";
import { constructURLFromUTMParams, isFulfilled, nanoid } from "@dub/utils";
import { bulkCreateLinks } from "../links";
import { extractUtmParams } from "../utm/extract-utm-params";
import {
  derivePartnerLinkKey,
  generatePartnerLink,
} from "./generate-partner-link";

interface CreateDefaultPartnerLinksInput {
  workspace: Pick<WorkspaceProps, "id" | "plan">;
  program: Pick<ProgramProps, "defaultFolderId" | "id">;
  partner: Pick<
    CreatePartnerProps,
    "name" | "email" | "username" | "tenantId"
  > & { id: string };
  group: {
    defaultLinks: PartnerGroupDefaultLink[];
    utmTemplate: UtmTemplateProps | null;
  };
  link?: CreatePartnerProps["linkProps"];
  userId: string;
}

// Create partner default links based on group defaults
export async function createPartnerDefaultLinks({
  workspace,
  program,
  partner,
  group: { defaultLinks, utmTemplate },
  link,
  userId,
}: CreateDefaultPartnerLinksInput) {
  if (defaultLinks.length === 0) {
    return [];
  }

  const hasMoreThanOneDefaultLink = defaultLinks.length > 1;

  const processedLinks = (
    await Promise.allSettled(
      defaultLinks.map((defaultLink) => {
        let key = derivePartnerLinkKey({
          username: partner.username,
          name: partner.name,
          email: partner.email,
        });

        key = hasMoreThanOneDefaultLink
          ? `${key}-${nanoid(4).toLowerCase()}`
          : key;

        return generatePartnerLink({
          workspace,
          program,
          partner,
          link: {
            ...link,
            key,
            domain: defaultLink.domain,
            url: constructURLFromUTMParams(
              defaultLink.url,
              extractUtmParams(utmTemplate),
            ),
            ...extractUtmParams(utmTemplate, { excludeRef: true }),
            partnerGroupDefaultLinkId: defaultLink.id,
          },
          userId,
        });
      }),
    )
  )
    .filter(isFulfilled)
    .map(({ value }) => value);

  return await bulkCreateLinks({
    links: processedLinks,
    skipRedisCache: true,
  });
}
