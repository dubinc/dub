import {
  DubApiError,
  exceededLimitError,
  handleAndReturnErrorResponse,
} from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { PlanProps, TokenFound, WorkspaceProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import {
  API_DOMAIN,
  DUB_WORKSPACE_ID,
  getSearchParams,
  isDubDomain,
} from "@dub/utils";
import { Link as LinkProps } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { throwIfNoAccess } from "../api/tokens/permissions";
import {
  Scope,
  availableScopes,
  roleScopesMapping,
} from "../api/tokens/scopes";
import { isBetaTester } from "../edge-config";
import { hashToken } from "./hash-token";
import { Session, getSession } from "./utils";

interface WithWorkspaceHandler {
  ({
    req,
    params,
    searchParams,
    headers,
    session,
    workspace,
    domain,
    link,
    scopes,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    headers?: Record<string, string>;
    session: Session;
    workspace: WorkspaceProps;
    domain: string;
    link?: LinkProps;
    scopes: Scope[];
  }): Promise<Response>;
}

export const withWorkspace = (
  handler: WithWorkspaceHandler,
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
    needNotExceededClicks, // if the action needs the user to not have exceeded their clicks usage
    needNotExceededLinks, // if the action needs the user to not have exceeded their links usage
    allowAnonymous, // special case for /api/links (POST /api/links) – allow no session
    allowSelf, // special case for removing yourself from a workspace
    skipLinkChecks, // special case for /api/links/exists – skip link checks
    domainChecks, // if the action needs to check if the domain belongs to the workspace
    betaFeature, // if the action is a beta feature
    requiredScopes = [],
  }: {
    requiredPlan?: Array<PlanProps>;
    needNotExceededClicks?: boolean;
    needNotExceededLinks?: boolean;
    allowAnonymous?: boolean;
    allowSelf?: boolean;
    skipLinkChecks?: boolean;
    domainChecks?: boolean;
    betaFeature?: boolean;
    requiredScopes?: Scope[];
  } = {},
) => {
  return async (
    req: Request,
    { params = {} }: { params: Record<string, string> | undefined },
  ) => {
    const searchParams = getSearchParams(req.url);

    let apiKey: string | undefined = undefined;
    let headers = {};

    try {
      const authorizationHeader = req.headers.get("Authorization");
      if (authorizationHeader) {
        if (!authorizationHeader.includes("Bearer ")) {
          throw new DubApiError({
            code: "bad_request",
            message:
              "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth",
          });
        }
        apiKey = authorizationHeader.replace("Bearer ", "");
      }

      const domain = params?.domain || searchParams.domain;
      const key = searchParams.key;
      const linkId =
        params?.linkId ||
        searchParams.linkId ||
        searchParams.externalId ||
        undefined;

      let session: Session | undefined;
      let workspaceId: string | undefined;
      let workspaceSlug: string | undefined;
      let scopes: Scope[] = [];

      const idOrSlug =
        params?.idOrSlug ||
        searchParams.workspaceId ||
        params?.slug ||
        searchParams.projectSlug;

      // if there's no workspace ID or slug
      if (!idOrSlug) {
        // for /api/links (POST /api/links) – allow no session (but warn if user provides apiKey)
        if (allowAnonymous && !apiKey) {
          // @ts-expect-error
          return await handler({
            req,
            params,
            searchParams,
            headers,
          });
        } else {
          throw new DubApiError({
            code: "not_found",
            message:
              "Workspace id not found. Did you forget to include a `workspaceId` query parameter? Learn more: https://d.to/id",
          });
        }
      }

      if (idOrSlug.startsWith("ws_")) {
        workspaceId = idOrSlug.replace("ws_", "");
      } else {
        workspaceSlug = idOrSlug;
      }

      if (apiKey) {
        const isRestrictedToken = apiKey.startsWith("dub_");
        const tokenTable = isRestrictedToken ? "restrictedToken" : "token";
        const hashedKey = await hashToken(apiKey);

        const token: TokenFound = await (prisma[tokenTable] as any).findUnique({
          where: {
            hashedKey,
          },
          select: {
            ...(isRestrictedToken && { scopes: true, rateLimit: true }),
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                isMachine: true,
              },
            },
          },
        });

        if (!token || !token.user) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Unauthorized: Invalid API key.",
          });
        }

        // Rate limit checks for API keys
        const rateLimit = "rateLimit" in token ? token.rateLimit : 600;

        const { success, limit, reset, remaining } = await ratelimit(
          rateLimit,
          "1 m",
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

        waitUntil(
          // update last used time
          (prisma[tokenTable] as any).update({
            where: {
              hashedKey,
            },
            data: {
              lastUsed: new Date(),
            },
          }),
        );

        // @ts-ignore
        scopes = isRestrictedToken ? token.scopes.split(" ") : availableScopes;

        session = {
          user: {
            id: token.user.id,
            name: token.user.name || "",
            email: token.user.email || "",
            isMachine: token.user.isMachine,
          },
        };
      } else {
        session = await getSession();
        if (!session?.user?.id) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Unauthorized: Login required.",
          });
        }
      }

      let [workspace, link] = (await Promise.all([
        prisma.project.findUnique({
          where: {
            id: workspaceId || undefined,
            slug: workspaceSlug || undefined,
          },
          include: {
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
          },
        }),
        linkId
          ? prisma.link.findUnique({
              where: {
                ...(linkId.startsWith("ext_") && workspaceId
                  ? {
                      projectId_externalId: {
                        projectId: workspaceId,
                        externalId: linkId.replace("ext_", ""),
                      },
                    }
                  : { id: linkId }),
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
      ])) as [WorkspaceProps, LinkProps | undefined];

      if (!workspace || !workspace.users) {
        // workspace doesn't exist
        throw new DubApiError({
          code: "not_found",
          message: "Workspace not found.",
        });
      }

      // For session requests, find the scopes based on the user's role
      if (session && !apiKey) {
        scopes = roleScopesMapping[workspace.users[0].role];
      }

      // Check user has permission to make the action
      throwIfNoAccess({
        scopes,
        requiredScopes,
        workspaceId: workspace.id,
      });

      // beta feature checks
      if (betaFeature) {
        const betaTester = await isBetaTester(workspace.id);
        if (!betaTester) {
          throw new DubApiError({
            code: "forbidden",
            message: "Unauthorized: Beta feature.",
          });
        }
      }

      // edge case where linkId is an externalId and workspaceId was not provided (they must've used projectSlug instead)
      // in this case, we need to try fetching the link again
      if (linkId && linkId.startsWith("ext_") && !link && !workspaceId) {
        link = (await prisma.link.findUnique({
          where: {
            projectId_externalId: {
              projectId: workspace.id,
              externalId: linkId.replace("ext_", ""),
            },
          },
        })) as LinkProps;
      }

      // if domain is defined:
      // - it's a dub domain and domainChecks is required, check if the user is part of the dub workspace
      // - it's a custom domain, check if the domain belongs to the workspace
      if (domain) {
        if (isDubDomain(domain)) {
          if (domainChecks && workspace.id !== DUB_WORKSPACE_ID) {
            throw new DubApiError({
              code: "forbidden",
              message: "Domain does not belong to workspace.",
            });
          }
        } else if (!workspace.domains.find((d) => d.slug === domain)) {
          throw new DubApiError({
            code: "forbidden",
            message: "Domain does not belong to workspace.",
          });
        }
      }

      // workspace exists but user is not part of it
      if (workspace.users.length === 0) {
        const pendingInvites = await prisma.projectInvite.findUnique({
          where: {
            email_projectId: {
              email: session.user.email,
              projectId: workspace.id,
            },
          },
          select: {
            expires: true,
          },
        });
        if (!pendingInvites) {
          throw new DubApiError({
            code: "not_found",
            message: "Workspace not found.",
          });
        } else if (pendingInvites.expires < new Date()) {
          throw new DubApiError({
            code: "invite_expired",
            message: "Workspace invite expired.",
          });
        } else {
          throw new DubApiError({
            code: "invite_pending",
            message: "Workspace invite pending.",
          });
        }
      }

      console.log({ allowSelf });

      // workspace role checks
      // if (
      //   !requiredRole.includes(workspace.users[0].role) &&
      //   !(allowSelf && searchParams.userId === session.user.id)
      // ) {
      //   throw new DubApiError({
      //     code: "forbidden",
      //     message: "Unauthorized: Insufficient permissions.",
      //   });
      // }

      // clicks usage overage checks
      if (needNotExceededClicks && workspace.usage > workspace.usageLimit) {
        throw new DubApiError({
          code: "forbidden",
          message: exceededLimitError({
            plan: workspace.plan,
            limit: workspace.usageLimit,
            type: "clicks",
          }),
        });
      }

      // links usage overage checks
      if (
        needNotExceededLinks &&
        workspace.linksUsage > workspace.linksLimit &&
        (workspace.plan === "free" || workspace.plan === "pro")
      ) {
        throw new DubApiError({
          code: "forbidden",
          message: exceededLimitError({
            plan: workspace.plan,
            limit: workspace.linksLimit,
            type: "links",
          }),
        });
      }

      // plan checks
      if (!requiredPlan.includes(workspace.plan)) {
        throw new DubApiError({
          code: "forbidden",
          message: "Unauthorized: Need higher plan.",
        });
      }

      // analytics API checks
      const url = new URL(req.url || "", API_DOMAIN);
      if (
        workspace.plan === "free" &&
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

        // make sure the link is owned by the workspace
        if (!link || link.projectId !== workspace?.id) {
          throw new DubApiError({
            code: "not_found",
            message: "Link not found.",
          });
        }
      }

      return await handler({
        req,
        params,
        searchParams,
        headers,
        session,
        workspace,
        domain,
        link,
        scopes,
      });
    } catch (error) {
      return handleAndReturnErrorResponse(error, headers);
    }
  };
};
