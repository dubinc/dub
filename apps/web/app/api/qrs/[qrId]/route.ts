import { checkFeaturesAccessAuthLess } from "@/lib/actions/check-features-access-auth-less.ts";
import { DubApiError } from "@/lib/api/errors";
import { includeTags } from "@/lib/api/links/include-tags.ts";
import { getQr } from "@/lib/api/qrs/get-qr";
import { updateQr } from "@/lib/api/qrs/update-qr";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { updateQrBodySchema } from "@/lib/zod/schemas/qrs";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

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

      // waitUntil(
      //   sendWorkspaceWebhook({
      //     trigger: "link.updated",
      //     workspace,
      //     data: linkEventSchema.parse(response),
      //   }),
      // );

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

// PUT /api/links/[qrId] – archive a qr
export const PUT = withWorkspace(
  async ({ req, headers, params, workspace, session }) => {
    // TODO: CHECK
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

    if (session.user.id !== qr.userId) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: "Access denied",
      });
    }

    const body = (await parseRequestBody(req)) || {};

    const updatedLink = await prisma.link.update({
      where: {
        id: qr.link!.id!,
      },
      data: {
        archived: body.archived || false,
      },
    });

    return NextResponse.json(
      {
        qr: {
          ...qr,
          link: updatedLink,
        },
      },
      { headers },
    );
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

    const removedQr = await prisma.qr.delete({
      where: {
        id: qr.id,
      },
    });

    const removedLink = await prisma.link.delete({
      where: {
        id: qr.link!.id,
      },
      include: {
        ...includeTags,
      },
    });

    return NextResponse.json(
      { linkId: removedLink.id, qrId: removedQr.id },
      { headers },
    );
  },
  {
    requiredPermissions: ["links.write"],
  },
);
