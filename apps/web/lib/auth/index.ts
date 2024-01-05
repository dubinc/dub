import { authOptions } from "./options";
import prisma from "@/lib/prisma";
import { Link as LinkProps } from "@prisma/client";
import { PlanProps, ProjectProps } from "../types";
import { getServerSession } from "next-auth/next";
import { createHash } from "crypto";
import {
  API_DOMAIN,
  DUB_PROJECT_ID,
  getSearchParams,
  isDubDomain,
} from "@dub/utils";
import { ratelimit } from "../upstash";

export interface Session {
  user: {
    email: string;
    id: string;
    name: string;
    image?: string;
  };
}

export const getSession = async () => {
  return getServerSession(authOptions) as Promise<Session>;
};

export const hashToken = (
  token: string,
  {
    noSecret = false,
  }: {
    noSecret?: boolean;
  } = {},
) => {
  return createHash("sha256")
    .update(`${token}${noSecret ? "" : process.env.NEXTAUTH_SECRET}`)
    .digest("hex");
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
export const withAuth =
  (
    handler: WithAuthHandler,
    {
      requiredPlan = ["free", "pro", "enterprise"], // if the action needs a specific plan
      requiredRole = ["owner", "member"],
      needNotExceededUsage, // if the action needs the user to not have exceeded their usage
      allowAnonymous, // special case for /api/links (POST /api/links) – allow no session
      allowSelf, // special case for removing yourself from a project
      skipLinkChecks, // special case for /api/links/exists – skip link checks
    }: {
      requiredPlan?: Array<PlanProps>;
      requiredRole?: Array<"owner" | "member">;
      needNotExceededUsage?: boolean;
      allowAnonymous?: boolean;
      allowSelf?: boolean;
      skipLinkChecks?: boolean;
    } = {},
  ) =>
  async (
    req: Request,
    { params }: { params: Record<string, string> | undefined },
  ) => {
    const searchParams = getSearchParams(req.url);
    const { linkId } = params || {};
    const slug = params?.slug || searchParams.projectSlug;
    const domain = params?.domain || searchParams.domain;
    const key = searchParams.key;

    let session: Session | undefined;
    let headers = {};

    const authorizationHeader = req.headers.get("Authorization");
    if (authorizationHeader) {
      if (!authorizationHeader.includes("Bearer ")) {
        return new Response(
          "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://dub.sh/auth ",
          {
            status: 400,
          },
        );
      }
      const apiKey = authorizationHeader.replace("Bearer ", "");

      const url = new URL(req.url || "", API_DOMAIN);

      if (url.pathname.includes("/stats")) {
        return new Response("API access is not available for stats yet.", {
          status: 403,
        });
      }

      if (!slug && url.pathname.includes("/links")) {
        return new Response(
          "API access is only available for projects with custom domains. Did you forget to include a `projectSlug` query parameter?",
          {
            status: 403,
          },
        );
      }

      const hashedKey = hashToken(apiKey, {
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
        return new Response("Unauthorized: Invalid API key.", {
          status: 401,
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
      session = await getSession();
      if (!session?.user.id) {
        // for demo links, we allow anonymous link creation
        if (allowAnonymous) {
          // @ts-expect-error
          return handler({
            req,
            params: params || {},
            searchParams,
            headers,
          });
        }

        return new Response("Unauthorized: Login required.", {
          status: 401,
          headers,
        });
      }
    }

    const [project, link] = (await Promise.all([
      slug &&
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
              },
            },
          },
        }),
      linkId
        ? prisma.link.findUnique({
            where: {
              id: linkId,
            },
          })
        : domain && key && key !== "_root"
        ? prisma.link.findUnique({
            where: {
              domain_key: {
                domain,
                key,
              },
            },
          })
        : undefined,
    ])) as [ProjectProps | undefined, LinkProps | undefined];

    // project checks
    if (slug) {
      if (!project || !project.users) {
        // project doesn't exist
        return new Response("Project not found.", {
          status: 404,
          headers,
        });
      }

      // prevent unauthorized access to domains that don't belong to the project
      if (domain) {
        if (!project.domains?.find((d) => d.slug === domain)) {
          return new Response("Domain does not belong to project.", {
            status: 403,
            headers,
          });
        }
      }

      // project exists but user is not part of it
      if (project.users.length === 0) {
        const pendingInvites = await prisma.projectInvite.findUnique({
          where: {
            email_projectId: {
              email: session.user.email,
              projectId: project.id,
            },
          },
          select: {
            expires: true,
          },
        });
        if (!pendingInvites) {
          return new Response("Project not found.", {
            status: 404,
            headers,
          });
        } else if (pendingInvites.expires < new Date()) {
          return new Response("Project invite expired.", {
            status: 410,
            headers,
          });
        } else {
          return new Response("Project invite pending.", {
            status: 409,
            headers,
          });
        }
      }

      // project role checks (enterprise only)
      if (
        requiredRole &&
        project.plan === "enterprise" &&
        !requiredRole.includes(project.users[0].role) &&
        !(allowSelf && searchParams.userId === session.user.id)
      ) {
        return new Response("Unauthorized: Insufficient permissions.", {
          status: 403,
          headers,
        });
      }

      // usage overage checks
      if (needNotExceededUsage && project.usage > project.usageLimit) {
        return new Response("Unauthorized: Usage limits exceeded.", {
          status: 403,
          headers,
        });
      }

      // plan checks
      if (!requiredPlan.includes(project.plan)) {
        // return res.status(403).end("Unauthorized: Need higher plan.");
        return new Response("Unauthorized: Need higher plan.", {
          status: 403,
          headers,
        });
      }
      // for generic DUB_DOMAINS links / stats
    } else {
      if (domain && !isDubDomain(domain)) {
        return new Response("Domain not found.", {
          status: 404,
          headers,
        });
      }
    }

    // link checks (if linkId or domain and key are provided)
    if ((linkId || (domain && key && key !== "_root")) && !skipLinkChecks) {
      // if link doesn't exist
      if (!link) {
        return new Response("Link not found.", {
          status: 404,
          headers,
        });
      }

      // if it's a custom project link, we need to make sure the link is owned by the project
      if (slug) {
        if (link.projectId !== project?.id) {
          return new Response("Link not found.", {
            status: 404,
            headers,
          });
        }

        // if it's generic DUB_DOMAINS links, we need to make sure the user is the owner of the link
      } else if (isDubDomain(link.domain)) {
        if (
          link.projectId !== DUB_PROJECT_ID ||
          link.userId !== session.user.id
        ) {
          return new Response("Link not found.", {
            status: 404,
            headers,
          });
        }

        // if the domain is not part of DUB_DOMAINS
      } else {
        return new Response("Link not found.", {
          status: 404,
          headers,
        });
      }
    }

    return handler({
      req,
      params: params || {},
      searchParams,
      headers,
      session,
      project: project as ProjectProps,
      domain,
      link,
    });
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
    const session = await getSession();
    if (!session?.user.id) {
      return new Response("Unauthorized: Login required.", { status: 401 });
    }

    const searchParams = getSearchParams(req.url);
    return handler({ req, params, searchParams, session });
  };
