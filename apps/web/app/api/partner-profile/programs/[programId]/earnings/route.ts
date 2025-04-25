import { getCustomerEvents } from "@/lib/analytics/get-customer-events";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { generateRandomName } from "@/lib/names";
import z from "@/lib/zod";
import {
  PartnerEarningsSchema,
  getPartnerEarningsQuerySchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/earnings – get earnings for a partner in a program enrollment
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program, links } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const {
      page,
      pageSize,
      type,
      status,
      sortBy,
      sortOrder,
      linkId,
      customerId,
      payoutId,
      interval,
      start,
      end,
    } = getPartnerEarningsQuerySchema.parse(searchParams);

    const { startDate, endDate } = getStartEndDates({
      interval,
      start,
      end,
    });

    const events = customerId
      ? await getCustomerEvents({
          customerId,
          eventType: "sales",
          linkIds: links.map((link) => link.id),
          hideMetadata: true, // don't expose metadata to partners
        })
      : null;

    const earnings = await prisma.commission.findMany({
      where: customerId
        ? {
            eventId: {
              in: (events || []).map(({ eventId }) => eventId).filter(Boolean),
            },
          }
        : {
            earnings: {
              gt: 0,
            },
            programId: program.id,
            partnerId: partner.id,
            status,
            type,
            linkId,
            customerId,
            payoutId,
            createdAt: {
              gte: startDate.toISOString(),
              lte: endDate.toISOString(),
            },
          },
      include: {
        customer: true,
        link: {
          select: {
            id: true,
            shortLink: true,
            url: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    let ineligibleEarnings: any[] = [];

    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: {
          id: customerId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          projectId: true,
        },
      });

      if (customer && customer.projectId !== program.workspaceId) {
        throw new DubApiError({
          code: "not_found",
          message: "Customer is not part of this program.",
        });
      }

      const salesWithoutCommissions = (events || []).filter(
        (event) => !earnings.some((e) => e.eventId === event.eventId),
      );

      ineligibleEarnings = salesWithoutCommissions.map((event) => ({
        ...event,
        ...event.sale,
        id: null,
        invoiceId: null,
        quantity: null,
        earnings: 0,
        type: "sale",
        status: "ineligible",
        currency: "usd",
        customer,
        createdAt: new Date(event.timestamp),
        updatedAt: new Date(event.timestamp),
      }));
    }

    const data = z.array(PartnerEarningsSchema).parse(
      [...earnings, ...ineligibleEarnings].map((e) => ({
        ...e,
        customer: e.customer
          ? {
              ...e.customer,
              // fallback to a random name if the customer doesn't have an email
              email:
                e.customer.email ?? e.customer.name ?? generateRandomName(),
            }
          : null,
      })),
    );

    return NextResponse.json(data);
  },
);
