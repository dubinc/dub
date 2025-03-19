import { prefixWorkspaceId } from "@/lib/api/workspace-id";
import { plain } from "@/lib/plain";
import { prisma } from "@dub/prisma";
import { capitalize, formatDate } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import {
  plainCopySection,
  plainDivider,
  plainEmptyContainer,
  plainSpacer,
  plainUsageSection,
} from "./utils";

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

    const userName = user.name || customer.email.split("@")[0];

    await plain.upsertCustomer({
      identifier: {
        emailAddress: customer.email,
      },
      onCreate: {
        fullName: userName,
        shortName: userName.split(" ")[0],
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

  const [topWorkspace, plainCustomer] = await Promise.all([
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
            tags: true,
            users: true,
          },
        },
      },
      orderBy: {
        usageLimit: "desc",
      },
      take: 1,
    }),
    plain.getCustomerByEmail({
      email: customer.email,
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
    usage,
    usageLimit,
    totalClicks,
    linksUsage,
    linksLimit,
    totalLinks,
    domainsLimit,
    tagsLimit,
    usersLimit,
    _count: { domains, tags, users },
  } = topWorkspace;

  if (plainCustomer.data) {
    await plain.addCustomerToCustomerGroups({
      customerId: plainCustomer.data.id,
      customerGroupIdentifiers: [
        {
          customerGroupKey: plan.split(" ")[0],
        },
      ],
    });
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
          ...plainCopySection({
            label: "Workspace Name",
            value: name,
          }),
          plainSpacer,
          ...plainCopySection({
            label: "Workspace Slug",
            value: slug,
          }),
          plainDivider,
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
                          ? "ORANGE"
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
          plainSpacer,
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
          {
            componentSpacer: {
              spacerSize: "M",
            },
          },
          plainUsageSection({
            usage: linksUsage,
            usageLimit: linksLimit,
            label: "Links",
            sublabel: "This billing period",
            color: "YELLOW",
          }),
          {
            componentSpacer: {
              spacerSize: "M",
            },
          },
          plainUsageSection({
            usage: totalClicks,
            label: "Total Clicks",
            color: "GREEN",
          }),
          {
            componentSpacer: {
              spacerSize: "M",
            },
          },
          plainUsageSection({
            usage: totalLinks,
            label: "Total Links",
            color: "YELLOW",
          }),
          {
            componentSpacer: {
              spacerSize: "M",
            },
          },
          plainUsageSection({
            usage: domains,
            usageLimit: domainsLimit,
            label: "Total Domains",
            color: "BLUE",
          }),
          {
            componentSpacer: {
              spacerSize: "M",
            },
          },
          plainUsageSection({
            usage: tags,
            usageLimit: tagsLimit,
            label: "Total Tags",
            color: "RED",
          }),
          {
            componentSpacer: {
              spacerSize: "M",
            },
          },
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
