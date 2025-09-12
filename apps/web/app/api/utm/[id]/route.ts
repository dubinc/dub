import { DubApiError } from "@/lib/api/errors";
import { extractUtmParams } from "@/lib/api/utm/extract-utm-params";
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
    });

    if (!template) {
      throw new DubApiError({
        code: "not_found",
        message: "Template not found.",
      });
    }

    try {
      const updatedTemplate = await prisma.utmTemplate.update({
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
        include: {
          partnerGroup: {
            include: {
              partnerGroupDefaultLinks: true,
            },
          },
        },
      });

      const utmFieldsChanged = !deepEqual(
        extractUtmParams(updatedTemplate),
        extractUtmParams(template),
      );

      if (utmFieldsChanged && updatedTemplate.partnerGroup) {
        waitUntil(
          (async () => {
            const defaultLinks =
              updatedTemplate.partnerGroup?.partnerGroupDefaultLinks;

            if (defaultLinks && defaultLinks.length > 0) {
              for (const defaultLink of defaultLinks) {
                const res = await prisma.partnerGroupDefaultLink.update({
                  where: {
                    id: defaultLink.id,
                  },
                  data: {
                    url: constructURLFromUTMParams(
                      defaultLink.url,
                      extractUtmParams(updatedTemplate),
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

      return NextResponse.json(updatedTemplate);
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
