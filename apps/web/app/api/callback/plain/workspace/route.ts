import { prefixWorkspaceId } from "@/lib/api/workspace-id";
import { plain } from "@/lib/plain";
import { prisma } from "@dub/prisma";
import { capitalize, formatDate } from "@dub/utils";
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
            key: "workspace",
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

  const [plainCustomer, topWorkspace] = await Promise.all([
    plain.getCustomerByEmail({
      email: customer.email,
    }),
    prisma.project.findFirst({
      where: {
        users: {
          some: {
            userId: customer.externalId,
          },
        },
      },
      include: {
        _count: {
          select: {
            domains: true,
            users: true,
          },
        },
      },
      orderBy: {
        usageLimit: "desc",
      },
      take: 1,
    }),
  ]);

  if (!topWorkspace) {
    return NextResponse.json({
      cards: [
        {
          key: "workspace",
          components: [
            plainEmptyContainer("User does not belong to any workspace."),
          ],
        },
      ],
    });
  }

  const {
    id,
    name,
    slug,
    plan,
    stripeId,
    usage,
    usageLimit,
    totalClicks,
    linksUsage,
    linksLimit,
    totalLinks,
    domainsLimit,
    usersLimit,
    _count: { domains, users },
  } = topWorkspace;

  const companyDomainName = customer.email && customer.email.split("@")[1];

  if (plainCustomer.data) {
    await Promise.allSettled([
      plain.addCustomerToCustomerGroups({
        customerId: plainCustomer.data.id,
        customerGroupIdentifiers: [
          {
            customerGroupKey: topWorkspace.plan.split(" ")[0],
          },
        ],
      }),
      ...(topWorkspace && companyDomainName
        ? [
            plain.updateCompanyTier({
              companyIdentifier: {
                companyDomainName,
              },
              tierIdentifier: {
                externalId: topWorkspace.plan.split(" ")[0],
              },
            }),
          ]
        : []),
    ]);
  }

  return NextResponse.json({
    cards: [
      {
        key: "workspace",
        components: [
          ...plainCopySection({
            label: "Workspace ID",
            value: prefixWorkspaceId(id),
          }),
          plainSpacer,
          ...plainCopySection({
            label: "Workspace Name",
            value: name,
          }),
          plainSpacer,
          ...plainCopySection({
            label: "Workspace Slug",
            value: slug,
          }),
          plainSpacer,
          {
            componentRow: {
              rowMainContent: [
                {
                  componentText: {
                    text: "Plan",
                  },
                },
              ],
              rowAsideContent: [
                {
                  componentBadge: {
                    badgeLabel: capitalize(plan),
                    badgeColor:
                      plan === "enterprise"
                        ? "RED"
                        : plan === "advanced"
                          ? "YELLOW"
                          : plan.startsWith("business")
                            ? "GREEN"
                            : plan === "pro"
                              ? "BLUE"
                              : "GREY",
                  },
                },
              ],
            },
          },
          ...(stripeId
            ? [
                uiComponent.spacer({
                  size: "M",
                }),
                uiComponent.row({
                  mainContent: [
                    uiComponent.text({
                      text: "Stripe Customer",
                      size: "M",
                      color: "NORMAL",
                    }),
                    uiComponent.text({
                      text: stripeId,
                      size: "S",
                      color: "MUTED",
                    }),
                  ],
                  asideContent: [
                    uiComponent.linkButton({
                      url: `https://dashboard.stripe.com/customers/${stripeId}`,
                      label: "View in Stripe",
                    }),
                  ],
                }),
              ]
            : []),
          uiComponent.spacer({
            size: "M",
          }),
          {
            componentRow: {
              rowMainContent: [
                {
                  componentText: {
                    text: "Customer since",
                  },
                },
              ],
              rowAsideContent: [
                {
                  componentText: {
                    text: formatDate(topWorkspace.createdAt),
                  },
                },
              ],
            },
          },
          plainDivider,
          plainUsageSection({
            usage,
            usageLimit,
            label: "Clicks",
            sublabel: "This billing period",
            color: "GREEN",
          }),
          uiComponent.spacer({
            size: "M",
          }),
          plainUsageSection({
            usage: linksUsage,
            usageLimit: linksLimit,
            label: "Links",
            sublabel: "This billing period",
            color: "YELLOW",
          }),
          uiComponent.spacer({
            size: "M",
          }),
          plainUsageSection({
            usage: totalClicks,
            label: "Total Clicks",
            color: "GREEN",
          }),
          uiComponent.spacer({
            size: "M",
          }),
          plainUsageSection({
            usage: totalLinks,
            label: "Total Links",
            color: "YELLOW",
          }),
          uiComponent.spacer({
            size: "M",
          }),
          plainUsageSection({
            usage: domains,
            usageLimit: domainsLimit,
            label: "Total Domains",
            color: "BLUE",
          }),
          uiComponent.spacer({
            size: "M",
          }),
          plainUsageSection({
            usage: users,
            usageLimit: usersLimit,
            label: "Total Users",
            color: "GREY",
          }),
        ],
      },
    ],
  });
}
