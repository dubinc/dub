import { withAdmin } from "@/lib/auth";
import { partnerProfileChangeHistoryLogSchema } from "@/lib/zod/schemas/partner-profile";
import { sendEmail } from "@dub/email";
import NetworkPartnerApplicationApproved from "@dub/email/templates/network-partner-application-approved";
import NetworkPartnerApplicationRejected from "@dub/email/templates/network-partner-application-rejected";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const updateAdminNetworkStatusSchema = z.object({
  status: z.enum(["approved", "rejected", "draft"]),
});

// PATCH /api/admin/partners/[partnerId]/network-status
export const PATCH = withAdmin(
  async ({ params, req }) => {
    const { partnerId } = params;
    const { status: updatedStatus } = updateAdminNetworkStatusSchema.parse(
      await req.json(),
    );

    const existingPartner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        networkStatus: true,
        changeHistoryLog: true,
      },
    });

    if (!existingPartner) {
      return new Response("Partner not found.", { status: 404 });
    }

    if (existingPartner.networkStatus === updatedStatus) {
      return new Response("Partner is already in this status.", {
        status: 400,
      });
    }

    if (
      existingPartner.networkStatus === "trusted" &&
      updatedStatus === "approved"
    ) {
      return new Response("Trusted partners cannot be approved.", {
        status: 400,
      });
    }

    let partnerChangeHistoryLog = existingPartner.changeHistoryLog
      ? partnerProfileChangeHistoryLogSchema.parse(
          existingPartner.changeHistoryLog,
        )
      : [];

    if (updatedStatus === "draft") {
      // if reverting back to draft, remove any pre-existing networkStatus change logs
      partnerChangeHistoryLog = partnerChangeHistoryLog.filter(
        (log) => log.field !== "networkStatus",
      );
    } else {
      partnerChangeHistoryLog.push({
        field: "networkStatus",
        from: existingPartner.networkStatus,
        to: updatedStatus,
        changedAt: new Date(),
      });
    }

    const updatedPartner = await prisma.partner.update({
      where: {
        id: partnerId,
      },
      data: {
        networkStatus: updatedStatus,
        changeHistoryLog: partnerChangeHistoryLog,
        reviewedAt: updatedStatus === "draft" ? null : new Date(),
      },
      select: {
        id: true,
        networkStatus: true,
      },
    });

    if (
      existingPartner.email &&
      // only send notification emails if partner actually submitted their profile
      existingPartner.networkStatus === "submitted" &&
      (updatedStatus === "approved" || updatedStatus === "rejected")
    ) {
      waitUntil(
        sendEmail({
          to: existingPartner.email,
          subject:
            updatedStatus === "approved"
              ? "Your Dub Partner Network application was approved"
              : "Dub Partner Network application update",
          variant: "notifications",
          react:
            updatedStatus === "approved"
              ? NetworkPartnerApplicationApproved({
                  name: existingPartner.name,
                  email: existingPartner.email,
                })
              : NetworkPartnerApplicationRejected({
                  name: existingPartner.name,
                  email: existingPartner.email,
                }),
        }),
      );
    }

    return NextResponse.json(updatedPartner);
  },
  {
    requiredRoles: ["owner"],
  },
);
