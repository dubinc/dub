import {
  CreatePartnerProps,
  ProgramProps,
  UtmTemplateProps,
  WorkspaceProps,
} from "@/lib/types";
import { isFulfilled, nanoid } from "@dub/utils";
import { PartnerGroupDefaultLink } from "@prisma/client";
import { bulkCreateLinks } from "../links";
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

  const hasMoreThanOneLink = defaultLinks.length > 1;

  const processedLinks = (
    await Promise.allSettled(
      defaultLinks.map((defaultLink) => {
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
            key,
            partnerGroupDefaultLinkId: defaultLink.id,
            domain: defaultLink.domain,
            url: defaultLink.url,
            utm_source: utmTemplate?.utm_source,
            utm_medium: utmTemplate?.utm_medium,
            utm_campaign: utmTemplate?.utm_campaign,
            utm_term: utmTemplate?.utm_term,
            utm_content: utmTemplate?.utm_content,
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
