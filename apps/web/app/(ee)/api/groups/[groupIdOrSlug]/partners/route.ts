import { DubApiError } from "@/lib/api/errors";
import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { bulkCreateLinks } from "@/lib/api/links";
import { generatePartnerLink } from "@/lib/api/partners/generate-partner-link";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { WorkspaceProps } from "@/lib/types";
import { changeGroupSchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import {
  Link,
  Partner,
  PartnerGroupDefaultLink,
  UtmTemplate,
} from "@dub/prisma/client";
import {
  APP_DOMAIN_WITH_NGROK,
  constructURLFromUTMParams,
  isFulfilled,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// POST /api/groups/[groupIdOrSlug]/partners - add partners to group
export const POST = withWorkspace(
  async ({ req, params, workspace, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      programId,
      groupId: params.groupIdOrSlug,
      includeExpandedFields: true,
    });

    let { partnerIds } = changeGroupSchema.parse(await parseRequestBody(req));
    partnerIds = [...new Set(partnerIds)];

    if (partnerIds.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "At least one partner ID is required.",
      });
    }

    const [program, programEnrollments] = await Promise.all([
      prisma.program.findUniqueOrThrow({
        where: {
          id: programId,
        },
      }),

      prisma.programEnrollment.findMany({
        where: {
          partnerId: {
            in: partnerIds,
          },
          programId,
        },
        include: {
          partner: true,
          partnerGroup: true,
          links: {
            where: {
              partnerGroupDefaultLink: {
                isNot: null,
              },
            },
          },
        },
      }),
    ]);

    const { count } = await prisma.programEnrollment.updateMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
      },
      data: {
        groupId: group.id,
        clickRewardId: group.clickRewardId,
        leadRewardId: group.leadRewardId,
        saleRewardId: group.saleRewardId,
        discountId: group.discountId,
      },
    });

    if (count > 0) {
      waitUntil(
        (async () => {
          await qstash.publishJSON({
            url: `${APP_DOMAIN_WITH_NGROK}/api/cron/links/invalidate-for-discounts`,
            body: {
              groupId: group.id,
              partnerIds,
            },
          });

          const response = programEnrollments.map(({ partner, links }) =>
            remapPartnerGroupDefaultLinks({
              partner,
              links,
              newGroup: {
                utmTemplate: group.utmTemplate,
                defaultLinks: group.partnerGroupDefaultLinks,
              },
            }),
          );

          const linksToCreate = response.flatMap(
            ({ linksToCreate }) => linksToCreate,
          );

          const linksToUpdate = response.flatMap(
            ({ linksToUpdate }) => linksToUpdate,
          );

          console.log("linksToUpdate", linksToUpdate);
          console.log("linksToCreate", linksToCreate);

          // Create the links
          if (linksToCreate.length > 0) {
            const processedLinks = (
              await Promise.allSettled(
                linksToCreate.map((link) => {
                  const programEnrollment = programEnrollments.find(
                    (p) => p.partner.id === link.partnerId,
                  );

                  const partner = programEnrollment?.partner;

                  return generatePartnerLink({
                    workspace: {
                      id: workspace.id,
                      plan: workspace.plan as WorkspaceProps["plan"],
                    },
                    program: {
                      id: program.id,
                      defaultFolderId: program.defaultFolderId,
                    },
                    partner: {
                      id: partner?.id,
                      name: partner?.name,
                      email: partner?.email!,
                      tenantId: programEnrollment?.tenantId ?? undefined,
                    },
                    link: {
                      domain: link.domain,
                      url: link.url,
                      tenantId: programEnrollment?.tenantId ?? undefined,
                      partnerGroupDefaultLinkId: link.partnerGroupDefaultLinkId,
                      utm_source: link.utm_source,
                      utm_medium: link.utm_medium,
                      utm_campaign: link.utm_campaign,
                      utm_term: link.utm_term,
                      utm_content: link.utm_content,
                      ref: link.ref,
                    },
                    userId: session.user.id,
                  });
                }),
              )
            )
              .filter(isFulfilled)
              .map(({ value }) => value);

            await bulkCreateLinks({
              links: processedLinks,
            });
          }

          // Update the links
          if (linksToUpdate.length > 0) {
            await Promise.allSettled(
              linksToUpdate.map((link) => {
                const newUrl = constructURLFromUTMParams(link.url, {
                  utm_source: link.utm_source,
                  utm_medium: link.utm_medium,
                  utm_campaign: link.utm_campaign,
                  utm_term: link.utm_term,
                  utm_content: link.utm_content,
                  ref: link.ref,
                });

                return prisma.link.update({
                  where: {
                    id: link.id,
                  },
                  data: {
                    partnerGroupDefaultLinkId: link.partnerGroupDefaultLinkId,
                    url: newUrl,
                    utm_source: link.utm_source,
                    utm_medium: link.utm_medium,
                    utm_campaign: link.utm_campaign,
                    utm_term: link.utm_term,
                    utm_content: link.utm_content,
                  },
                });
              }),
            );
          }
        })(),
      );
    }

    return NextResponse.json({
      count,
    });
  },
  {
    requiredPermissions: ["groups.write"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);

// Add a new method that update the partner group default links when their group changes
function remapPartnerGroupDefaultLinks({
  partner,
  links,
  newGroup,
}: {
  partner: Pick<Partner, "id">;
  links: Pick<Link, "id" | "url" | "partnerGroupDefaultLinkId">[];
  newGroup: {
    utmTemplate: UtmTemplate | null;
    defaultLinks: Pick<PartnerGroupDefaultLink, "id" | "domain" | "url">[];
  };
}) {
  const newUtmParams = {
    utm_source: newGroup.utmTemplate?.utm_source || "",
    utm_medium: newGroup.utmTemplate?.utm_medium || "",
    utm_campaign: newGroup.utmTemplate?.utm_campaign || "",
    utm_term: newGroup.utmTemplate?.utm_term || "",
    utm_content: newGroup.utmTemplate?.utm_content || "",
    ref: newGroup.utmTemplate?.ref || "",
  };

  // 1. Remap existing links (wrap around if fewer new defaults)
  const linksToUpdate = links.map((link, index) => {
    const targetDefault =
      newGroup.defaultLinks[index % newGroup.defaultLinks.length];

    return {
      id: link.id,
      partnerGroupDefaultLinkId: targetDefault.id,
      url: targetDefault.url,
      ...newUtmParams,
    };
  });

  // 2. Create extra links if new group has more defaults
  const linksToCreate =
    newGroup.defaultLinks.length > links.length
      ? newGroup.defaultLinks.slice(links.length).map((targetDefault) => ({
          partnerId: partner.id,
          partnerGroupDefaultLinkId: targetDefault.id,
          domain: targetDefault.domain,
          url: targetDefault.url,
          ...newUtmParams,
        }))
      : [];

  return {
    linksToCreate,
    linksToUpdate,
  };
}
