import {
  applyAppsFlyerParameters,
  loadAppsFlyerParameters,
} from "@/lib/integrations/appsflyer/apply-parameters";
import { AppsFlyerSettings } from "@/lib/integrations/appsflyer/schema";
import { isAppsFlyerTrackingUrl } from "@/lib/middleware/utils/is-appsflyer-tracking-url";
import {
  CreatePartnerProps,
  ProgramProps,
  UtmTemplateProps,
  WorkspaceProps,
} from "@/lib/types";
import { PartnerGroupDefaultLink } from "@dub/prisma/client";
import { constructURLFromUTMParams, isFulfilled } from "@dub/utils";
import { bulkCreateLinks } from "../links";
import { extractUtmParams } from "../utm/extract-utm-params";
import {
  buildPartnerDefaultLinkKey,
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

  // Check if any default link URL is an AppsFlyer URL and load settings once
  const hasAppsFlyerUrl = defaultLinks.some((dl) =>
    isAppsFlyerTrackingUrl(dl.url),
  );

  let appsFlyerParameters: AppsFlyerSettings["parameters"] = [];

  if (hasAppsFlyerUrl) {
    appsFlyerParameters = await loadAppsFlyerParameters(workspace.id);
  }

  const processedLinks = (
    await Promise.allSettled(
      defaultLinks.map((defaultLink) => {
        const key = buildPartnerDefaultLinkKey({
          link,
          partner,
          hasMoreThanOneDefaultLink,
        });

        let url = constructURLFromUTMParams(
          defaultLink.url,
          extractUtmParams(utmTemplate),
        );

        // Inject AppsFlyer parameters with resolved macros
        if (
          appsFlyerParameters.length > 0 &&
          isAppsFlyerTrackingUrl(defaultLink.url)
        ) {
          url = applyAppsFlyerParameters({
            url,
            parameters: appsFlyerParameters,
            context: {
              partnerName: partner.name,
              partnerLinkKey: key,
            },
          });
        }

        return generatePartnerLink({
          workspace,
          program,
          partner,
          link: {
            ...link,
            key,
            domain: defaultLink.domain,
            url,
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
