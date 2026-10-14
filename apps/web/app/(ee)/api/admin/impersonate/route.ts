import { getAnalytics } from "@/lib/analytics/get-analytics";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { normalizeDomainInput } from "@/lib/api/domains/normalize-domain-input";
import { withAdmin } from "@/lib/auth";
import { createImpersonationUrls } from "@/lib/better-auth/admin-impersonation-plugin";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUsage } from "@/lib/tinybird/get-workspace-usage";
import { emailSchema } from "@/lib/zod/schemas/auth";
import {
  isAppHostname,
  isDubDomain,
  PARTNERS_DOMAIN,
  validDomainRegex,
  validSlugRegex,
} from "@dub/utils";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const userSelect = {
  name: true,
  email: true,
  image: true,
  projects: {
    select: {
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          planPeriod: true,
          trialEndsAt: true,
          defaultProgramId: true,
          partnersUsage: true,
          totalClicks: true,
          totalLinks: true,
          programs: {
            select: {
              id: true,
              slug: true,
              url: true,
            },
          },
        },
      },
    },
    where: {
      project: {
        environment: "production",
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
      role: {
        in: ["owner", "billing"], // in cases of disabled workspaces, the billing user is the owner
      },
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
  | { type: "domain"; domain: string }
  | { type: "stripeCustomerId"; stripeCustomerId: string }
  | { type: "link"; domain: string; key: string };

type ImpersonateUserRecord = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>;

type ImpersonateProject = Prisma.UserGetPayload<{
  select: typeof userSelect;
}>["projects"][number]["project"];

type ImpersonateLinkDetails = {
  domain: string;
  key: string;
  url: string;
  shortLink: string;
  createdBy: boolean;
  project: ImpersonateProject | null;
};

type FindUserResult =
  | { error: string }
  | { user: ImpersonateUserRecord; link?: ImpersonateLinkDetails };

const IMPERSONATE_QUERY_ERROR =
  "Enter a user email, workspace slug, domain, short link, or Stripe customer ID";

const STRIPE_CUSTOMER_ID_REGEX = /cus_[a-zA-Z0-9]+/;

function parseImpersonateQuery(
  raw: unknown,
): ImpersonateIdentifier | { error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { error: IMPERSONATE_QUERY_ERROR };
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

  const stripeCustomerId = query.match(STRIPE_CUSTOMER_ID_REGEX)?.[0];
  if (
    stripeCustomerId &&
    (query.startsWith("cus_") || query.includes("stripe.com"))
  ) {
    return { type: "stripeCustomerId", stripeCustomerId };
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

  if (hostname && pathname) {
    const dubDomain = hostname.replace(/^www\./, "");
    const key = decodePathKey(pathname);
    // dub.sh/abc (and other Dub short domains) impersonate the link creator
    if (key && isDubDomain(dubDomain)) {
      return { type: "link", domain: dubDomain, key };
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

  return { error: IMPERSONATE_QUERY_ERROR };
}

function decodePathKey(pathname: string) {
  const key = pathname.replace(/^\/+|\/+$/g, "");
  if (!key) return "";
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

// POST /api/admin/impersonate
export const POST = withAdmin(async ({ req }) => {
  const { query, email, slug, domain, stripeCustomerId } = await req.json();
  const parsed = parseImpersonateQuery(
    query ?? email ?? slug ?? domain ?? stripeCustomerId,
  );

  if ("error" in parsed) {
    return new Response(parsed.error, { status: 400 });
  }

  const result = await findUser(parsed);

  if ("error" in result) {
    return new Response(result.error, { status: 404 });
  }

  const { user: response } = result;
  const link = "link" in result ? result.link : undefined;

  if (!response.email) {
    return new Response("User not found", { status: 404 });
  }

  const workspaces = await serializeWorkspaces(
    response.projects.map(({ project }) => project),
  );

  const data = {
    email: response.email,
    name: response.name,
    image: response.image,
    workspaces,
    programs:
      response.partners.length > 0
        ? response.partners[0].partner.programs.map(({ program, ...rest }) => ({
            ...program,
            ...rest,
          }))
        : [],
    impersonateUrl: await createImpersonationUrls(response.email),
    ...(link
      ? {
          link: {
            domain: link.domain,
            key: link.key,
            url: link.url,
            shortLink: link.shortLink,
            createdBy: link.createdBy,
            workspace: await serializeLinkWorkspace(link.project, workspaces),
          },
        }
      : {}),
  };

  return NextResponse.json(data);
});

async function serializeLinkWorkspace(
  project: ImpersonateProject | null,
  workspaces: Awaited<ReturnType<typeof serializeWorkspaces>>,
) {
  if (!project) return null;

  return (
    workspaces.find((workspace) => workspace.id === project.id) ??
    (await serializeWorkspaces([project]))[0] ??
    null
  );
}

async function serializeWorkspaces(projects: ImpersonateProject[]) {
  const useLast30DaysStats = projects.length <= 2;
  const programIds = projects
    .map((project) => project.defaultProgramId)
    .filter((id): id is string => Boolean(id));

  const { startDate } = getStartEndDates({ interval: "30d" });

  const [statsByWorkspaceId, commissionsByProgramId] = await Promise.all([
    useLast30DaysStats
      ? getLast30DayWorkspaceStats(projects)
      : Promise.resolve(new Map<string, { clicks: number; links: number }>()),
    programIds.length > 0
      ? prisma.commission
          .groupBy({
            by: ["programId"],
            where: {
              programId: {
                in: programIds,
              },
              status: {
                in: ["pending", "processed", "paid"],
              },
              createdAt: {
                gte: startDate,
              },
            },
            _sum: {
              earnings: true,
            },
          })
          .then(
            (rows) =>
              new Map(
                rows.map((row) => [row.programId, row._sum.earnings ?? 0]),
              ),
          )
      : Promise.resolve(new Map<string, number>()),
  ]);

  return projects.map((project) => {
    const stats = statsByWorkspaceId.get(project.id);
    const program = project.defaultProgramId
      ? project.programs.find((item) => item.id === project.defaultProgramId) ??
        project.programs[0]
      : null;

    return {
      id: project.id,
      name: project.name,
      slug: project.slug,
      plan: project.plan,
      planPeriod: project.planPeriod,
      trialEndsAt: project.trialEndsAt,
      events: stats?.clicks ?? project.totalClicks,
      links: stats?.links ?? project.totalLinks,
      statsInterval: useLast30DaysStats ? ("30d" as const) : ("all" as const),
      program: program
        ? {
            url: program.url ?? `${PARTNERS_DOMAIN}/${program.slug}`,
            partners: project.partnersUsage,
            commissions: commissionsByProgramId.get(program.id) ?? 0,
          }
        : null,
    };
  });
}

async function getLast30DayWorkspaceStats(projects: ImpersonateProject[]) {
  const entries = await Promise.all(
    projects.map(async (project) => {
      try {
        const [analytics, linksUsage] = await Promise.all([
          getAnalytics({
            workspaceId: project.id,
            event: "clicks",
            groupBy: "count",
            interval: "30d",
          }),
          getWorkspaceUsage({
            workspaceId: project.id,
            resource: "links",
            interval: "30d",
          }),
        ]);

        const clicks =
          analytics &&
          typeof analytics === "object" &&
          "clicks" in analytics &&
          typeof analytics.clicks === "number"
            ? analytics.clicks
            : project.totalClicks;

        const links = linksUsage.reduce(
          (acc, curr) => acc + (curr.value ?? 0),
          0,
        );

        return [project.id, { clicks, links }] as const;
      } catch (error) {
        console.error(
          `Failed to fetch 30d stats for workspace ${project.slug}:`,
          error,
        );
        return [
          project.id,
          { clicks: project.totalClicks, links: project.totalLinks },
        ] as const;
      }
    }),
  );

  return new Map(entries);
}

async function findUserByLink(
  domain: string,
  key: string,
): Promise<FindUserResult> {
  const link = await prisma.link.findUnique({
    where: { domain_key: { domain, key } },
    select: {
      domain: true,
      key: true,
      url: true,
      shortLink: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
      project: {
        select: {
          ...userSelect.projects.select.project.select,
          users: {
            where: ownerSelect.users.where,
            orderBy: ownerSelect.users.orderBy,
            take: ownerSelect.users.take,
            select: {
              user: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!link) {
    return { error: "Link not found" };
  }

  const creatorId = link.user?.email ? link.user.id : null;
  const userId = creatorId ?? link.project?.users[0]?.user.id;

  if (!userId) {
    return { error: "Link owner not found" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user?.email) {
    return { error: "Link owner not found" };
  }

  const project = link.project
    ? (({ users: _users, ...rest }) => rest)(link.project)
    : null;

  return {
    user,
    link: {
      domain: link.domain,
      key: link.key,
      url: link.url,
      shortLink: link.shortLink,
      createdBy: Boolean(creatorId),
      project,
    },
  };
}

async function findUser(
  identifier: ImpersonateIdentifier,
): Promise<FindUserResult> {
  if (identifier.type === "link") {
    return findUserByLink(identifier.domain, identifier.key);
  }

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

  if (identifier.type === "stripeCustomerId") {
    const project = await prisma.project.findUnique({
      where: {
        stripeId: identifier.stripeCustomerId,
      },
      select: ownerSelect,
    });

    if (project) {
      const user = project.users[0]?.user;
      if (!user?.email) {
        return { error: "Workspace owner not found" };
      }
      return { user };
    }

    const customer = await prisma.customer.findUnique({
      where: {
        stripeCustomerId: identifier.stripeCustomerId,
      },
      select: {
        project: {
          select: ownerSelect,
        },
      },
    });

    if (!customer?.project) {
      return { error: "Workspace not found for this Stripe customer ID" };
    }

    const user = customer.project.users[0]?.user;
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
