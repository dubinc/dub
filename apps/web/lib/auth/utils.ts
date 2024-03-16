import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  API_DOMAIN,
  DUB_PROJECT_ID,
  getSearchParams,
  isDubDomain,
} from "@dub/utils";
import { Link as LinkProps } from "@prisma/client";
import { exceededLimitError } from "../api/errors";
import { PlanProps, ProjectProps } from "../types";
import { ratelimit } from "../upstash";

export interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
}

export const hashToken = async (
  token: string,
  {
    noSecret = false,
  }: {
    noSecret?: boolean;
  } = {},
) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(
    `${token}${noSecret ? "" : process.env.NEXTAUTH_SECRET}`,
  );
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

interface WithAuthHandler {
  ({
    req,
    params,
    searchParams,
    headers,
    session,
    project,
    domain,
    link,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    headers?: Record<string, string>;
    session: Session;
    project: ProjectProps;
    domain: string;
    link?: LinkProps;
  }): Promise<Response>;
}

export const withAuth = (
  handler: WithAuthHandler,
  {
    requiredPlan = [
      "free",
      "pro",
      "business",
      "business plus",
      "business max",
      "business extra",
      "enterprise",
    ], // if the action needs a specific plan
    requiredRole = ["owner", "member"],
    needNotExceededClicks, // if the action needs the user to not have exceeded their clicks usage
    needNotExceededLinks, // if the action needs the user to not have exceeded their links usage
    allowAnonymous, // special case for /api/links (POST /api/links) – allow no session
    allowSelf, // special case for removing yourself from a project
    skipLinkChecks, // special case for /api/links/exists – skip link checks
  }: {
    requiredPlan?: Array<PlanProps>;
    requiredRole?: Array<"owner" | "member">;
    needNotExceededClicks?: boolean;
    needNotExceededLinks?: boolean;
    allowAnonymous?: boolean;
    allowSelf?: boolean;
    skipLinkChecks?: boolean;
  } = {},
) => {
  return async (
    req: Request,
    { params }: { params: Record<string, string> | undefined },
  ) => {
    const searchParams = getSearchParams(req.url);
    const { linkId } = params || {};

    let apiKey: string | undefined = undefined;

    const authorizationHeader = req.headers.get("Authorization");
    if (authorizationHeader) {
      if (!authorizationHeader.includes("Bearer ")) {
        return new Response(
          "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth ",
          {
            status: 400,
          },
        );
      }
      apiKey = authorizationHeader.replace("Bearer ", "");
    }

    const domain = params?.domain || searchParams.domain;
    const key = searchParams.key;

    let session: Session | null = null;
    let headers = {};

    const slug = params?.slug || searchParams.projectSlug;

    try {
      // if there's no projectSlug defined
      if (!slug) {
        // for /api/links (POST /api/links) – allow no session (but warn if user provides apiKey)
        if (allowAnonymous && !apiKey) {
          // @ts-expect-error
          return await handler({
            req,
            params: params || {},
            searchParams,
            headers,
          });
        } else {
          throw new DubApiError({
            code: "not_found",
            message:
              "Project slug not found. Did you forget to include a `projectSlug` query parameter?",
          });
        }
      }

      if (apiKey) {
        const hashedKey = await hashToken(apiKey, {
          noSecret: true,
        });

        const user = await prisma.user.findFirst({
          where: {
            tokens: {
              some: {
                hashedKey,
              },
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });
        if (!user) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Unauthorized: Invalid API key.",
          });
        }

        const { success, limit, reset, remaining } = await ratelimit(
          10,
          "1 s",
        ).limit(apiKey);

        headers = {
          "Retry-After": reset.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        };

        if (!success) {
          throw new DubApiError({
            code: "rate_limit_exceeded",
            message: "Too many requests.",
          });
        }
        await prisma.token.update({
          where: {
            hashedKey,
          },
          data: {
            lastUsed: new Date(),
          },
        });
        session = {
          user: {
            id: user.id,
            name: user.name || "",
            email: user.email || "",
          },
        };
      } else {
        session = (await auth()) as Session;
      }

      if (!session?.user) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Unauthorized: Login required.",
        });
      }

      let [project, link] = (await Promise.all([
        prisma.project.findUnique({
          where: {
            slug,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            usage: true,
            usageLimit: true,
            linksUsage: true,
            linksLimit: true,
            domainsLimit: true,
            tagsLimit: true,
            usersLimit: true,
            plan: true,
            stripeId: true,
            billingCycleStart: true,
            createdAt: true,
            users: {
              where: {
                userId: session.user.id,
              },
              select: {
                role: true,
              },
            },
            domains: {
              select: {
                slug: true,
                primary: true,
              },
            },
            inviteCode: true,
          },
        }),
        linkId
          ? prisma.link.findUnique({
              where: {
                id: linkId,
              },
            })
          : domain &&
            key &&
            (key === "_root"
              ? prisma.domain.findUnique({
                  where: {
                    slug: domain,
                  },
                })
              : prisma.link.findUnique({
                  where: {
                    domain_key: {
                      domain,
                      key,
                    },
                  },
                })),
      ])) as [ProjectProps, LinkProps | undefined];

      if (!project || !project.users) {
        // project doesn't exist
        throw new DubApiError({
          code: "not_found",
          message: "Project not found.",
        });
      }

      // prevent unauthorized access to domains that don't belong to the project
      if (
        domain &&
        !isDubDomain(domain) &&
        !project.domains.find((d) => d.slug === domain)
      ) {
        throw new DubApiError({
          code: "forbidden",
          message: "Domain does not belong to project.",
        });
      }

      // project exists but user is not part of it
      if (project.users.length === 0) {
        const pendingInvites = await prisma.projectInvite.findUnique({
          where: {
            email_projectId: {
              email: session.user.email!,
              projectId: project.id,
            },
          },
          select: {
            expires: true,
          },
        });
        if (!pendingInvites) {
          throw new DubApiError({
            code: "not_found",
            message: "Project not found.",
          });
        } else if (pendingInvites.expires < new Date()) {
          throw new DubApiError({
            code: "invite_expired",
            message: "Project invite expired.",
          });
        } else {
          throw new DubApiError({
            code: "invite_pending",
            message: "Project invite pending.",
          });
        }
      }

      // project role checks
      if (
        !requiredRole.includes(project.users[0].role) &&
        !(allowSelf && searchParams.userId === session.user.id)
      ) {
        throw new DubApiError({
          code: "forbidden",
          message: "Unauthorized: Insufficient permissions.",
        });
      }

      // clicks usage overage checks
      if (needNotExceededClicks && project.usage > project.usageLimit) {
        throw new DubApiError({
          code: "forbidden",
          message: exceededLimitError({
            plan: project.plan,
            limit: project.usageLimit,
            type: "clicks",
          }),
        });
      }

      // links usage overage checks
      if (
        needNotExceededLinks &&
        project.linksUsage > project.linksLimit &&
        (project.plan === "free" || project.plan === "pro")
      ) {
        throw new DubApiError({
          code: "forbidden",
          message: exceededLimitError({
            plan: project.plan,
            limit: project.linksLimit,
            type: "links",
          }),
        });
      }

      // plan checks
      if (!requiredPlan.includes(project.plan)) {
        throw new DubApiError({
          code: "forbidden",
          message: "Unauthorized: Need higher plan.",
        });
      }

      // analytics API checks
      const url = new URL(req.url || "", API_DOMAIN);
      if (
        project.plan === "free" &&
        apiKey &&
        url.pathname.includes("/analytics")
      ) {
        throw new DubApiError({
          code: "forbidden",
          message: "Analytics API is only available on paid plans.",
        });
      }

      // link checks (if linkId or domain and key are provided)
      if ((linkId || (domain && key && key !== "_root")) && !skipLinkChecks) {
        // special case for getting domain by ID
        // TODO: refactor domains to use the same logic as links
        if (!link && searchParams.checkDomain === "true") {
          const domain = await prisma.domain.findUnique({
            where: {
              id: linkId,
            },
          });
          if (domain) {
            link = {
              ...domain,
              domain: domain.slug,
              key: "_root",
              url: domain.target || "",
            } as unknown as LinkProps;
          }
        }

        // make sure the link is owned by the project
        if (!link || link.projectId !== project?.id) {
          throw new DubApiError({
            code: "not_found",
            message: "Link not found.",
          });
        }
      }

      return await handler({
        req,
        params: params || {},
        searchParams,
        headers,
        session,
        project,
        domain,
        link,
      });
    } catch (error) {
      console.error("withAuth Error -->", error.message);
      return handleAndReturnErrorResponse(error);
    }
  };
};

interface WithSessionHandler {
  ({
    req,
    params,
    searchParams,
    session,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    session: Session;
  }): Promise<Response>;
}

export const withSession =
  (handler: WithSessionHandler) =>
  async (req: Request, { params }: { params: Record<string, string> }) => {
    try {
      let session: Session | null;
      let headers = {};

      const authorizationHeader = req.headers.get("Authorization");
      if (authorizationHeader) {
        if (!authorizationHeader.includes("Bearer ")) {
          throw new DubApiError({
            code: "bad_request",
            message:
              "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth ",
          });
        }
        const apiKey = authorizationHeader.replace("Bearer ", "");

        const hashedKey = await hashToken(apiKey, {
          noSecret: true,
        });

        const user = await prisma.user.findFirst({
          where: {
            tokens: {
              some: {
                hashedKey,
              },
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });
        if (!user) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Unauthorized: Invalid API key.",
          });
        }

        const { success, limit, reset, remaining } = await ratelimit(
          10,
          "1 s",
        ).limit(apiKey);

        headers = {
          "Retry-After": reset.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        };

        if (!success) {
          return new Response("Too many requests.", {
            status: 429,
            headers,
          });
        }
        await prisma.token.update({
          where: {
            hashedKey,
          },
          data: {
            lastUsed: new Date(),
          },
        });
        session = {
          user: {
            id: user.id,
            name: user.name || "",
            email: user.email || "",
          },
        };
      } else {
        session = (await auth()) as Session;
      }

      if (!session?.user?.id) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Unauthorized: Login required.",
        });
      }

      const searchParams = getSearchParams(req.url);
      return await handler({ req, params, searchParams, session });
    } catch (error) {
      console.error("withSession Error -->", error.message);
      return handleAndReturnErrorResponse(error);
    }
  };

// Internal use only (for admin portal)
interface WithAdminHandler {
  ({
    req,
    params,
    searchParams,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
  }): Promise<Response>;
}

export const withAdmin =
  (handler: WithAdminHandler) =>
  async (req: Request, { params }: { params: Record<string, string> }) => {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("Unauthorized: Login required.", { status: 401 });
    }

    const response = await prisma.projectUsers.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: DUB_PROJECT_ID,
        },
      },
    });
    if (!response) {
      return new Response("Unauthorized: Not an admin.", { status: 401 });
    }

    const searchParams = getSearchParams(req.url);
    return handler({ req, params, searchParams });
  };
