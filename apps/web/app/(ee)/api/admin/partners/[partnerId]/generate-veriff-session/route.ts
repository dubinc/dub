import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createVeriffSession } from "@/lib/veriff/create-veriff-session";
import {
  mergeVeriffMetadata,
  parseVeriffMetadata,
} from "@/lib/veriff/veriff-metadata";
import { addDays } from "date-fns";
import { NextResponse } from "next/server";

// POST /api/admin/partners/[partnerId]/generate-veriff-session
export const POST = withAdmin(
  async ({ params }) => {
    const { partnerId } = params;

    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        identityVerificationStatus: true,
        veriffSessionId: true,
        veriffMetadata: true,
      },
    });

    if (!partner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (partner.identityVerificationStatus) {
      switch (partner.identityVerificationStatus) {
        case "approved":
          return new Response(
            "This partner's identity is already verified. No further action is required.",
            { status: 400 },
          );
        case "submitted":
        case "review":
          return new Response(
            "A verification attempt is already in progress.",
            { status: 400 },
          );
      }
    }

    const veriffMetadata = parseVeriffMetadata(partner.veriffMetadata);

    // If the session is already created and not expired, return the existing session
    // this is to avoid creating duplicate sessions
    if (
      partner.veriffSessionId &&
      veriffMetadata.sessionUrl &&
      veriffMetadata.sessionExpiresAt &&
      veriffMetadata.sessionExpiresAt > new Date()
    ) {
      return NextResponse.json({
        sessionUrl: veriffMetadata.sessionUrl,
      });
    }

    const { verification } = await createVeriffSession({
      partner,
    });

    await prisma.partner.update({
      where: {
        id: partner.id,
      },
      data: {
        veriffSessionId: verification.id,
        veriffMetadata: mergeVeriffMetadata(partner.veriffMetadata, {
          sessionUrl: verification.url,
          sessionExpiresAt: addDays(new Date(), 7),
        }),
      },
    });

    return NextResponse.json({
      sessionUrl: verification.url,
    });
  },
  {
    requiredRoles: ["owner"],
  },
);
