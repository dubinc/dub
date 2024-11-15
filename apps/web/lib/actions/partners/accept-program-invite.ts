"use server";

import { getEvents } from "@/lib/analytics/get-events";
import { createSaleData } from "@/lib/api/sales/sale";
import { createDotsUser } from "@/lib/dots/create-dots-user";
import { retrieveDotsUser } from "@/lib/dots/retrieve-dots-user";
import { prisma } from "@/lib/prisma";
import { saleEventResponseSchema } from "@/lib/zod/schemas/sales";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

export const acceptProgramInviteAction = authPartnerActionClient
  .schema(
    z.object({
      partnerId: z.string(),
      programInviteId: z.string(),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programInviteId } = parsedInput;

    if (!partner.dotsUserId) {
      throw new Error("Partner does not have a Dots user ID");
    }

    const programInvite = await prisma.programInvite.findUniqueOrThrow({
      where: { id: programInviteId },
      include: {
        program: {
          select: {
            workspace: {
              select: {
                id: true,
                dotsAppId: true,
              },
            },
          },
        },
      },
    });

    // enroll partner in program and delete the invite
    const [programEnrollment, dotsUser, _] = await Promise.all([
      prisma.programEnrollment.create({
        data: {
          programId: programInvite.programId,
          linkId: programInvite.linkId,
          partnerId: partner.id,
          status: "approved",
        },
        include: {
          program: true,
        },
      }),

      retrieveDotsUser({
        dotsUserId: partner.dotsUserId,
        partner,
      }),

      prisma.programInvite.delete({
        where: { id: programInvite.id },
      }),
    ]);

    const workspace = programInvite.program.workspace;

    if (workspace.dotsAppId) {
      const newDotsUser = await createDotsUser({
        dotsAppId: workspace.dotsAppId, // we need to create a new Dots user under the Program's Dots App
        userInfo: {
          firstName: dotsUser.first_name,
          lastName: dotsUser.last_name,
          email: dotsUser.email,
          countryCode: dotsUser.phone_number.country_code,
          phoneNumber: dotsUser.phone_number.phone_number,
        },
      });

      await prisma.programEnrollment.update({
        where: {
          id: programEnrollment.id,
        },
        data: { dotsUserId: newDotsUser.id },
      });
    }

    // Backfill sales for the partner's link
    const saleEvents = await getEvents({
      workspaceId: workspace.id,
      linkId: programInvite.linkId,
      event: "sales",
      interval: "all",
      page: 1,
      limit: 5000,
      order: "desc",
      sortBy: "timestamp",
    });

    const data = saleEvents.map(
      (e: z.infer<typeof saleEventResponseSchema>) => ({
        ...createSaleData({
          customerId: e.customer.id,
          linkId: e.link.id,
          clickId: e.click.id,
          invoiceId: e.invoice_id,
          eventId: e.eventId,
          paymentProcessor: e.payment_processor,
          amount: e.sale.amount,
          currency: "usd",
          partnerId: partner.id,
          program: programEnrollment.program,
          metadata: e.click,
        }),
        createdAt: new Date(e.timestamp),
      }),
    );

    if (data.length > 0) {
      await prisma.sale.createMany({
        data,
        skipDuplicates: true,
      });
    }
  });
