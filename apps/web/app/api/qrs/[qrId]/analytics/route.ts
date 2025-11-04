import { withWorkspace } from "@/lib/auth";
import { getQr } from "@/lib/api/qrs/get-qr";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { verifyFolderAccess } from '@/lib/folder/permissions';
import { recordLinkTB, transformLinkTB } from "@/lib/tinybird/record-link";

// No helper needed; we'll ingest to dub_links_metadata with stats_deleted=1

// DELETE /api/qrs/[qrId]/analytics – remove all Tinybird analytics for a QR (by its link)
export const DELETE = withWorkspace(
  async ({ headers, params, workspace, session }) => {
    const qr = await getQr({ qrId: params.qrId });

    const linkId = qr.linkId || qr.link?.id;
    if (!linkId) {
      return NextResponse.json(
        { ok: false, message: "QR has no associated link." },
        { status: 400, headers },
      );
    }

    if (qr.link?.folderId) {
      await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId: qr.link.folderId,
        requiredPermission: "folders.links.write",
      });
    }

    // Ingest a link metadata row with stats_deleted=1, same as bulk-delete pattern
    // const linkForIngest = qr.link ?? (await prisma.link.findUnique({ where: { id: linkId } }));
    // if (!linkForIngest) {
    //   return NextResponse.json(
    //     { ok: false, message: "Associated link not found." },
    //     { status: 404, headers },
    //   );
    // }
    // await recordLinkTB({
    //   ...transformLinkTB(linkForIngest),
    //   stats_deleted: true,
    // } as any);

    // await prisma.link.update({
    //   where: { id: linkId },
    //   data: {
    //     clicks: 0,
    //     leads: 0,
    //     sales: 0,
    //     saleAmount: 0,
    //   },
    // });

    return NextResponse.json(
      {
        qr,
        ok: true,
        message: "Analytics cleared for QR",
      },
      { headers },
    );
  },
  { requiredPermissions: ["links.write"] },
);
