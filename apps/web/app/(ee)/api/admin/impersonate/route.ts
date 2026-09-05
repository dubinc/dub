import { normalizeDomainInput } from "@/lib/api/domains/normalize-domain-input";
import { hashToken, withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailSchema } from "@/lib/zod/schemas/auth";
import {
  APP_DOMAIN,
  isAppHostname,
  PARTNERS_DOMAIN,
  validDomainRegex,
  validSlugRegex,
} from "@dub/utils";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

const userSelect = {
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
} satisfies Prisma.UserSelect;

const ownerSelect = {
  users: {
    where: {
      role: "owner",
      user: {
        email: {
          not: null,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 1,
    select: {
      user: {
        select: userSelect,
      },
    },
  },
} satisfies Prisma.ProjectSelect;

type ImpersonateIdentifier =
  | { type: "email"; email: string }
  | { type: "slug"; slug: string }
  | { type: "domain"; domain: string };

function parseImpersonateQuery(
  raw: unknown,
): ImpersonateIdentifier | { error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { error: "Enter a user email, workspace slug, or domain" };
  }

  let query = raw.trim();
  if (query.toLowerCase().startsWith("mailto:")) {
    query = query.slice(7).trim();
  }

  if (query.includes("@")) {
    const parsed = emailSchema.safeParse(query);
    if (!parsed.success) {
      return { error: "Invalid email" };
    }
    return { type: "email", email: parsed.data };
  }

  let hostname: string | undefined;
  let pathname: string | undefined;
  try {
    const url = query.includes("://")
      ? new URL(query)
      : query.includes("/")
        ? new URL(`https://${query}`)
        : undefined;
    if (url) {
      hostname = url.hostname.toLowerCase();
      pathname = url.pathname;
    }
  } catch {
    // keep the raw query
  }

  if (hostname && isAppHostname(hostname)) {
    const slug = pathname?.split("/").filter(Boolean)[0];
    if (slug && validSlugRegex.test(slug)) {
      return { type: "slug", slug: slug.toLowerCase() };
    }
  }

  const domain = normalizeDomainInput(hostname ?? query);
  if (validDomainRegex.test(domain)) {
    return { type: "domain", domain };
  }

  const slug = query.toLowerCase();
  if (validSlugRegex.test(slug)) {
    return { type: "slug", slug };
  }

  return { error: "Enter a user email, workspace slug, or domain" };
}

// POST /api/admin/impersonate
export const POST = withAdmin(async ({ req }) => {
  const { query, email, slug, domain } = await req.json();
  const parsed = parseImpersonateQuery(query ?? email ?? slug ?? domain);

  if ("error" in parsed) {
    return new Response(parsed.error, { status: 400 });
  }

  const result = await findUser(parsed);

  if ("error" in result) {
    return new Response(result.error, { status: 404 });
  }

  const { user: response } = result;

  if (!response.email) {
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
    impersonateUrl: await getImpersonateUrl(response.email),
  };

  return NextResponse.json(data);
});

async function findUser(identifier: ImpersonateIdentifier) {
  if (identifier.type === "email") {
    const userEmails = [identifier.email];
    const partner = await prisma.partner.findUnique({
      where: {
        email: identifier.email,
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

    const user = await prisma.user.findFirst({
      where: {
        email: {
          in: userEmails,
        },
      },
      select: userSelect,
    });

    if (!user?.email) {
      return { error: "User not found" };
    }

    return { user };
  }

  if (identifier.type === "domain") {
    const domainRecord = await prisma.domain.findUnique({
      where: {
        slug: identifier.domain,
      },
      select: {
        project: {
          select: ownerSelect,
        },
      },
    });

    if (!domainRecord) {
      return { error: "Domain not found" };
    }

    if (!domainRecord.project) {
      return { error: "Domain is not attached to a workspace" };
    }

    const user = domainRecord.project.users[0]?.user;
    if (!user?.email) {
      return { error: "Workspace owner not found" };
    }

    return { user };
  }

  const project = await prisma.project.findUnique({
    where: {
      slug: identifier.slug,
    },
    select: ownerSelect,
  });

  if (!project) {
    return { error: "Workspace not found" };
  }

  const user = project.users[0]?.user;
  if (!user?.email) {
    return { error: "Workspace owner not found" };
  }

  return { user };
}

async function getImpersonateUrl(email: string) {
  const token = randomBytes(32).toString("hex");

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: await hashToken(token, { secret: true }),
      expires: new Date(Date.now() + 60000),
      isAdminImpersonation: true,
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
