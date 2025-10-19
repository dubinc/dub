import { checkFeaturesAccessAuthLess } from "@/lib/actions/check-features-access-auth-less.ts";
import { DubApiError } from "@/lib/api/errors";
import { createQrWithLinkUniversal } from '@/lib/api/qrs/create-qr-with-link-universal';
import { getQr } from "@/lib/api/qrs/get-qr";
import { withWorkspace } from "@/lib/auth";
import { sendWorkspaceWebhook } from '@/lib/webhook/publish';
import { linkEventSchema } from '@/lib/zod/schemas/links';
import { waitUntil } from '@vercel/functions';
import { NextResponse } from "next/server";

// POST /api/qrs/[qrId]/duplicate – Duplicate qr by id
export const POST = withWorkspace(
  async ({ req, headers, workspace, params, session }) => {
    if (session?.user?.id) {
      const { featuresAccess } = await checkFeaturesAccessAuthLess(
        session?.user?.id,
      );

      if (!featuresAccess) {
        throw new Error("Access denied: Account have not subscription.");
      }
    }

    const qr = await getQr({
      qrId: params.qrId,
    });

    try {
      const { createdQr, createdLink } = await createQrWithLinkUniversal({
        qrData: {
          qrType: qr.qrType,
          data: qr.data,
          title: `${qr.title} (Copy)`,
          description: qr.description ?? undefined,
          styles: qr.styles as Record<string, any> | undefined,
          frameOptions: qr.frameOptions as Record<string, any> | undefined,
          fileId: qr.fileId ?? undefined,
          link: {
            url: qr.link?.url ?? "",
          },
        },
        linkData: {
          url: qr.link?.url ?? "",
        },
        workspace,
        userId: session?.user?.id,
        onLinkCreated: async (createdLink) => {
          if (createdLink.projectId && createdLink.userId) {
            waitUntil(
              sendWorkspaceWebhook({
                trigger: "link.created",
                workspace,
                data: linkEventSchema.parse(createdLink),
              }),
            );
          }
        },
      });

      return NextResponse.json(
        { qr: createdQr, link: createdLink },
        {
          headers,
        },
      );
    } catch (error) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: error.message,
      });
    }
  },
  {
    requiredPermissions: ["links.write"],
  },
);
