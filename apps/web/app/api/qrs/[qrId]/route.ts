import { checkFeaturesAccessAuthLess } from "@/lib/actions/check-features-access-auth-less.ts";
import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { processLink, updateLink } from "@/lib/api/links";
import { deleteQr } from "@/lib/api/qrs/delete-qr";
import { getQr } from "@/lib/api/qrs/get-qr";
import { updateQr } from "@/lib/api/qrs/update-qr";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { storage } from "@/lib/storage.ts";
import { updateQrBodySchema } from "@/lib/zod/schemas/qrs";
import {
  EQRType,
  FILE_QR_TYPES,
} from "@/ui/qr-builder/constants/get-qr-config";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/qrs/[qrId] - get a qr
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

// PATCH /api/qrs/[qrId] – update a qr
export const PATCH = withWorkspace(
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

    const body = updateQrBodySchema.parse(await parseRequestBody(req)) || {};

    const qrTypeChanged = body.qrType && body.qrType !== qr.qrType;
    const qrTypeChangedFromFileToNonFile =
      qrTypeChanged &&
      FILE_QR_TYPES.includes(qr.qrType as EQRType) &&
      !FILE_QR_TYPES.includes(body.qrType as EQRType);

    try {
      // Define the correct URL for the link
      let linkUrl: string;
      if (body.fileId) {
        // There is a new file - use the new URL
        linkUrl = `${R2_URL}/qrs-content/${body.fileId}`;
      } else if (qr.fileId && !qrTypeChangedFromFileToNonFile) {
        // There is no new file, but there is an existing file - use the existing URL
        linkUrl = `${R2_URL}/qrs-content/${qr.fileId}`;
      } else {
        // There is no file - use the data from the QR code or the existing URL
        linkUrl = body.link?.url || qr.link!.url;
      }

      const updatedLink = {
        ...qr.link!,
        url: linkUrl,
        geo: qr.link!.geo as Record<string, string> | null,
      };

      const {
        link: processedLink,
        error,
        code,
      } = await processLink({
        payload: {
          ...updatedLink,
          expiresAt: updatedLink.expiresAt?.toISOString() || null,
        },
        workspace,
        skipKeyChecks: true,
        skipExternalIdChecks: true,
        skipFolderChecks: true,
      });

      if (error) {
        throw new DubApiError({
          code: code as ErrorCodes,
          message: error,
        });
      }

      await updateLink({
        oldLink: {
          domain: qr.link!.domain,
          key: qr.link!.key,
          image: qr.link!.image,
        },
        updatedLink: processedLink,
      });

      const updatedQr = await updateQr(params.qrId, body);

      // We need to delete a file if either of two conditions is true:
      // 1. QR type changed from file to non-file
      // 2. Existing file replaced by a new file
      const shouldFileBeDeleted =
        qr.fileId &&
        (qrTypeChangedFromFileToNonFile || (body.fileId && !qrTypeChanged));

      if (shouldFileBeDeleted) {
        await storage.delete(`qrs-content/${qr.fileId}`);
      }

      return NextResponse.json(
        { qr: updatedQr },
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

// PUT /api/qrs/[qrId] – archive a qr
export const PUT = withWorkspace(
  async ({ req, headers, params, workspace, session }) => {
    if (session?.user?.id) {
      const { featuresAccess } = await checkFeaturesAccessAuthLess(
        session?.user?.id,
      );

      if (!featuresAccess) {
        throw new Error(
          "Access denied: This account does not have an active subscription.",
        );
      }
    }

    const qr = await getQr({
      qrId: params.qrId,
    });

    if (session.user.id !== qr.userId) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Access denied",
      });
    }

    const body = (await parseRequestBody(req)) || {};

    await prisma.link.update({
      where: {
        id: qr.link!.id,
      },
      data: {
        archived: body.archived || false,
      },
    });

    const updatedQr = await prisma.qr.update({
      where: {
        id: qr!.id!,
      },
      data: {
        archived: body.archived || false,
      },
    });

    return NextResponse.json({ qr: updatedQr }, { headers });
  },
  {
    requiredPermissions: ["links.write"],
  },
);

// DELETE /api/links/[qrId] –delete a qr
export const DELETE = withWorkspace(
  async ({ headers, params, workspace, session }) => {
    const qr = await getQr({
      qrId: params.qrId,
    });

    if (session.user.id !== qr.userId) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Access denied",
      });
    }

    const removedQr = await deleteQr(qr.id);

    return NextResponse.json({ qr: removedQr }, { headers });
  },
  {
    requiredPermissions: ["links.write"],
  },
);
