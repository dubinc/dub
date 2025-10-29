import { hashToken, withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

// POST /api/admin/impersonate
export const POST = withAdmin(async ({ req }) => {
  const { email, slug } = await req.json();

  const response = await prisma.user.findFirst({
    where: email
      ? { email }
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
    programs: response.partners[0].partner.programs.map(
      ({ program, ...rest }) => ({
        ...program,
        ...rest,
      }),
    ),
    impersonateUrl: await getImpersonateUrl(response.email),
  };

  return NextResponse.json(data);
});

async function getImpersonateUrl(email: string) {
  const token = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: await hashToken(token, { secret: true }),
      expires: new Date(Date.now() + 60000),
    },
  });

  return {
    app: `${APP_DOMAIN}/api/auth/callback/email?${new URLSearchParams({
      callbackUrl: APP_DOMAIN,
      email,
      token,
    })}`,
    partners: `${PARTNERS_DOMAIN}/api/auth/callback/email?${new URLSearchParams(
      {
        callbackUrl: PARTNERS_DOMAIN,
        email,
        token,
      },
    )}`,
  };
}
