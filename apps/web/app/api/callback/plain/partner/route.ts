import { plain } from "@/lib/plain";
import { prisma } from "@dub/prisma";
import { COUNTRIES, currencyFormatter, formatDate } from "@dub/utils";
import { uiComponent } from "@team-plain/typescript-sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  plainCopySection,
  plainDivider,
  plainEmptyContainer,
  plainSpacer,
  plainUsageSection,
} from "../utils";

export async function POST(req: NextRequest) {
  // authenticate webhook X-Plain-Webhook-Secret
  const token = req.headers.get("X-Plain-Webhook-Secret");
  if (token !== process.env.PLAIN_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let { cardKeys, customer } = await req.json();

  if (!cardKeys || !customer) {
    return new Response("Invalid payload", { status: 400 });
  }

  // if there's no externalId yet, try to find the user by email and set it
  if (!customer.externalId) {
    const user = await prisma.user.findUnique({
      where: {
        email: customer.email,
      },
    });

    if (!user) {
      return NextResponse.json({
        cards: [
          {
            key: "partner",
            components: [plainEmptyContainer("No user found.")],
          },
        ],
      });
    }

    customer.externalId = user.id;

    const customerName = user.name || customer.email.split("@")[0];

    await plain.upsertCustomer({
      identifier: {
        emailAddress: customer.email,
      },
      onCreate: {
        fullName: customerName,
        shortName: customerName.split(" ")[0],
        email: {
          email: customer.email,
          isVerified: true,
        },
        externalId: user.id,
      },
      onUpdate: {
        externalId: {
          value: user.id,
        },
      },
    });
  }

  const [plainCustomer, partnerProfile] = await Promise.all([
    plain.getCustomerByEmail({
      email: customer.email,
    }),
    prisma.partner.findFirst({
      where: {
        users: {
          some: {
            userId: customer.externalId,
          },
        },
      },
      include: {
        programs: {
          select: {
            program: {
              select: {
                name: true,
              },
            },
            createdAt: true,
            totalCommissions: true,
          },
          where: {
            totalCommissions: {
              gt: 0,
            },
          },
          orderBy: {
            totalCommissions: "desc",
          },
          take: 5,
        },
      },
    }),
  ]);

  if (!partnerProfile) {
    return NextResponse.json({
      cards: [
        {
          key: "partner",
          components: [plainEmptyContainer("No partner profile found.")],
        },
      ],
    });
  }

  const {
    id,
    name,
    email,
    country,
    stripeConnectId,
    paypalEmail,
    payoutsEnabledAt,
  } = partnerProfile;

  if (plainCustomer.data) {
    await plain.addCustomerToCustomerGroups({
      customerId: plainCustomer.data.id,
      customerGroupIdentifiers: [
        {
          customerGroupKey: "partners.dub.co",
        },
      ],
    });
  }

  return NextResponse.json({
    cards: [
      {
        key: "partner",
        components: [
          ...plainCopySection({
            label: "Partner ID",
            value: id,
          }),
          plainSpacer,
          ...plainCopySection({
            label: "Partner Name",
            value: name,
          }),
          ...(email
            ? [
                plainSpacer,
                ...plainCopySection({
                  label: "Partner Email",
                  value: email,
                }),
              ]
            : []),
          plainSpacer,
          ...plainCopySection({
            label: "Partner Country",
            value: country ? COUNTRIES[country] : "Unknown",
          }),
          ...(stripeConnectId
            ? [
                plainSpacer,
                uiComponent.row({
                  mainContent: [
                    uiComponent.text({
                      text: "Stripe Express Account",
                      size: "M",
                      color: "NORMAL",
                    }),
                    uiComponent.text({
                      text: stripeConnectId,
                      size: "S",
                      color: "MUTED",
                    }),
                  ],
                  asideContent: [
                    uiComponent.linkButton({
                      url: `https://dashboard.stripe.com/connect/accounts/${stripeConnectId}`,
                      label: "View in Stripe",
                    }),
                  ],
                }),
              ]
            : []),
          ...(paypalEmail
            ? [
                plainSpacer,
                ...plainCopySection({
                  label: "Paypal Email",
                  value: paypalEmail,
                }),
              ]
            : []),
          plainSpacer,
          uiComponent.row({
            mainContent: [
              uiComponent.text({
                text: "Payouts Enabled",
              }),
            ],
            asideContent: [
              uiComponent.badge({
                label: payoutsEnabledAt ? "Yes" : "No",
                color: payoutsEnabledAt ? "GREEN" : "RED",
              }),
            ],
          }),
          ...(partnerProfile.programs.length > 0
            ? [
                plainDivider,
                ...partnerProfile.programs.flatMap(
                  ({ program, createdAt, totalCommissions }) => [
                    plainUsageSection({
                      usage: currencyFormatter(totalCommissions / 100, {
                        maximumFractionDigits: 2,
                      }),
                      label: program.name,
                      sublabel: `Partner since ${formatDate(createdAt)}`,
                      color: "GREEN",
                    }),
                    uiComponent.spacer({
                      size: "M",
                    }),
                  ],
                ),
              ]
            : []),
        ],
      },
    ],
  });
}
