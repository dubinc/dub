import { withWorkspace } from "@/lib/auth";
import { getQr } from "@/lib/api/qrs/get-qr";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { verifyFolderAccess } from '@/lib/folder/permissions';

async function executeTinybirdDatasourceSoftDelete(
  datasource: string,
  updateCondition: string,
) {
  // Use the Tinybird datasources update endpoint to mark rows as deleted
  const url = `${process.env.TINYBIRD_API_URL}/v0/datasources/${datasource}/update`;
  const body = new URLSearchParams({
    update_expression: "stats_deleted = 1",
    update_condition: updateCondition,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tinybird update failed: ${text || res.statusText}`);
  }

  return true;
}

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

    const escapedLinkId = linkId.replace(/'/g, "''");
    const updateCondition = `(link_id='${escapedLinkId}')`;

    await Promise.all([
      executeTinybirdDatasourceSoftDelete("dub_links_metadata", updateCondition),
      executeTinybirdDatasourceSoftDelete("dub_links_metadata_latest", updateCondition),
    ]);

    await prisma.link.update({
      where: { id: linkId },
      data: {
        clicks: 0,
        leads: 0,
        sales: 0,
        saleAmount: 0,
      },
    });

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
