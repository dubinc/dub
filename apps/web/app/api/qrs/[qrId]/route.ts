import { DubApiError } from '@/lib/api/errors';
import { getQr } from '@/lib/api/qrs/get-qr';
import { parseRequestBody } from '@/lib/api/utils';
import { withWorkspace } from "@/lib/auth";
import { sendWorkspaceWebhook } from '@/lib/webhook/publish';
import { linkEventSchema } from '@/lib/zod/schemas/links';
import { updateQrBodySchema } from '@/lib/zod/schemas/qrs';
import { waitUntil } from '@vercel/functions/wait-until';
import { NextResponse } from "next/server";
import { prisma } from "@dub/prisma";
import { updateQr } from '@/lib/api/qrs/update-qr';

// GET /api/qrs/[qrId] – get a qr
export const GET = withWorkspace(
  async ({ headers, workspace, params, session }) => {
    const qr = await getQr({
      qrId: params.qrId,
    });

    return NextResponse.json(qr, { headers });
  },
  {
    requiredPermissions: ["links.read"],
  },
);

// PATCH /api/qrs/[qrId] – update a qr
export const PATCH = withWorkspace(
  async ({ req, headers, workspace, params, session }) => {
    const qr = await getQr({
      qrId: params.qrId,
    });

    const body = updateQrBodySchema.parse(await parseRequestBody(req)) || {};

    try {
      const response = await prisma.link.update({
        where: {
          id: qr.link!.id,
        },
        data: {
          url: body.link!.url,
          archived: body.archived || false,
        },
      });

      waitUntil(
        sendWorkspaceWebhook({
          trigger: "link.updated",
          workspace,
          data: linkEventSchema.parse(response),
        }),
      );

      const updatedQr = await updateQr(params.qrId, body);

      return NextResponse.json(updatedQr, {
        headers,
      });
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

// backwards compatibility
export const PUT = PATCH;

// // DELETE /api/links/[linkId] – delete a link
// export const DELETE = withWorkspace(
//   async ({ headers, params, workspace, session }) => {
//     const link = await getLinkOrThrow({
//       workspaceId: workspace.id,
//       linkId: params.linkId,
//     });

//     if (link.folderId) {
//       await verifyFolderAccess({
//         workspace,
//         userId: session.user.id,
//         folderId: link.folderId,
//         requiredPermission: "folders.links.write",
//       });
//     }

//     const response = await deleteLink(link.id);

//     waitUntil(
//       sendWorkspaceWebhook({
//         trigger: "link.deleted",
//         workspace,
//         data: linkEventSchema.parse(response),
//       }),
//     );

//     return NextResponse.json({ id: link.id }, { headers });
//   },
//   {
//     requiredPermissions: ["links.write"],
//   },
// );
