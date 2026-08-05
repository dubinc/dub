import { withAdmin } from "@/lib/auth";
import { createImpersonationUrls } from "@/lib/better-auth/admin-impersonation-plugin";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/admin/impersonate
export const POST = withAdmin(async ({ req }) => {
  const { email, slug } = await req.json();

  let userEmails: string[] = [];
  if (email) {
    userEmails.push(email);
    const partner = await prisma.partner.findUnique({
      where: {
        email,
      },
      select: {
        users: {
          select: {
            user: {
              select: {
                email: true,
              },
            },
          },
          take: 1,
        },
      },
    });
    if (partner?.users && partner.users.length > 0) {
      userEmails.push(...partner.users.map((user) => user.user.email || ""));
    }
  }

  const response = await prisma.user.findFirst({
    where:
      userEmails.length > 0
        ? {
            email: {
              in: userEmails,
            },
          }
        : {
            projects: {
              some: {
                project: {
                  slug,
                },
                role: "owner",
              },
            },
          },
    select: {
      email: true,
      projects: {
        select: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              usage: true,
              linksUsage: true,
              totalClicks: true,
              totalLinks: true,
            },
          },
        },
        orderBy: {
          project: {
            totalClicks: "desc",
          },
        },
      },
      partners: {
        select: {
          partner: {
            select: {
              programs: {
                select: {
                  program: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                  status: true,
                  totalClicks: true,
                  totalLeads: true,
                  totalConversions: true,
                  totalSaleAmount: true,
                  totalCommissions: true,
                },
                orderBy: {
                  totalCommissions: "desc",
                },
              },
            },
          },
        },
      },
    },
  });

  if (!response?.email) {
    return new Response("User not found", { status: 404 });
  }

  const data = {
    email: response.email,
    workspaces: response.projects.map(({ project }) => ({
      ...project,
      clicks: project.usage,
      links: project.linksUsage,
      totalClicks: project.totalClicks,
      totalLinks: project.totalLinks,
    })),
    programs:
      response.partners.length > 0
        ? response.partners[0].partner.programs.map(({ program, ...rest }) => ({
            ...program,
            ...rest,
          }))
        : [],
    impersonateUrl: await createImpersonationUrls(response.email),
  };

  return NextResponse.json(data);
});
