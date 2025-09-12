import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { updateUTMTemplateBodySchema } from "@/lib/zod/schemas/utm";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  constructURLFromUTMParams,
  deepEqual,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PATCH /api/utm/[id] – update a UTM template
export const PATCH = withWorkspace(
  async ({ req, params, workspace }) => {
    const { id } = params;
    const {
      name,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      ref,
    } = updateUTMTemplateBodySchema.parse(await req.json());

    const template = await prisma.utmTemplate.findFirst({
      where: {
        id,
        projectId: workspace.id,
      },
      include: {
        partnerGroup: {
          include: {
            partnerGroupDefaultLinks: true,
          },
        },
      },
    });

    if (!template) {
      throw new DubApiError({
        code: "not_found",
        message: "Template not found.",
      });
    }

    try {
      const templateUpdated = await prisma.utmTemplate.update({
        where: {
          id,
          projectId: workspace.id,
        },
        data: {
          name,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          ref,
        },
      });

      const utmFieldsChanged = !deepEqual(
        extractUtmParams(templateUpdated),
        extractUtmParams(template),
      );

      if (template.partnerGroup && utmFieldsChanged) {
        waitUntil(
          (async () => {
            const defaultLinks =
              template.partnerGroup?.partnerGroupDefaultLinks;
            if (defaultLinks && defaultLinks.length > 0) {
              for (const defaultLink of defaultLinks) {
                const res = await prisma.partnerGroupDefaultLink.update({
                  where: {
                    id: defaultLink.id,
                  },
                  data: {
                    url: constructURLFromUTMParams(
                      defaultLink.url,
                      extractUtmParams(templateUpdated),
                    ),
                  },
                });
                console.log(
                  `Updated default link ${defaultLink.id} with URL: ${res.url}`,
                );
              }
            }

            const res = await qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/groups/sync-utm`,
              body: {
                utmTemplateId: template.id,
              },
            });
            console.log(
              `Scheduled sync-utm job for template ${template.id}: ${JSON.stringify(res, null, 2)}`,
            );
          })(),
        );
      }

      return NextResponse.json(templateUpdated);
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "A template with that name already exists.",
        });
      }

      throw error;
    }
  },
  {
    requiredPermissions: ["links.write"],
  },
);

// DELETE /api/utm/[id] – delete a UTM template for a workspace
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const { id } = params;

    const template = await prisma.utmTemplate.findUnique({
      where: {
        id,
        projectId: workspace.id,
      },
      include: {
        partnerGroup: true,
      },
    });

    if (!template) {
      throw new DubApiError({
        code: "not_found",
        message: "UTM template not found.",
      });
    }

    if (template.partnerGroup) {
      throw new DubApiError({
        code: "conflict",
        message: `This template is linked to the partner group "${template.partnerGroup.name}" and cannot be deleted.`,
      });
    }

    await prisma.utmTemplate.delete({
      where: {
        id: template.id,
      },
    });

    return NextResponse.json({ id });
  },
  {
    requiredPermissions: ["links.write"],
  },
);

const extractUtmParams = (input: any) => ({
  utm_source: input.utm_source,
  utm_medium: input.utm_medium,
  utm_campaign: input.utm_campaign,
  utm_term: input.utm_term,
  utm_content: input.utm_content,
  ref: input.ref,
});
