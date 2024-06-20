import {
  DubApiError,
  exceededLimitError,
  handleAndReturnErrorResponse,
} from "@/lib/api/errors";
import { PlanProps, TokenFound, WorkspaceProps } from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import { API_DOMAIN, getSearchParams } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { StreamingTextResponse } from "ai";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { throwIfNoAccess } from "../api/tokens/permissions";
import { Scope, roleScopesMapping } from "../api/tokens/scopes";
import { isBetaTester } from "../edge-config";
import { prismaEdge } from "../prisma/edge";
import { hashToken } from "./hash-token";
import type { Session } from "./utils";

interface WithWorkspaceEdgeHandler {
  ({
    req,
    params,
    searchParams,
    headers,
    session,
    workspace,
    scopes,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    headers?: Record<string, string>;
    session: Session;
    workspace: WorkspaceProps;
    scopes: Scope[];
  }): Promise<Response | StreamingTextResponse>;
}

export const withWorkspaceEdge = (
  handler: WithWorkspaceEdgeHandler,
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
    needNotExceededAI, // if the action needs the user to not have exceeded their AI usage
    betaFeature, // if the action is a beta feature
    requiredScopes = [],
  }: {
    requiredPlan?: Array<PlanProps>;
    needNotExceededClicks?: boolean;
    needNotExceededLinks?: boolean;
    needNotExceededAI?: boolean;
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
        throw new DubApiError({
          code: "not_found",
          message:
            "Workspace id not found. Did you forget to include a `workspaceId` query parameter? Learn more: https://d.to/id",
        });
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

        const token: TokenFound = await (
          prismaEdge[tokenTable] as any
        ).findUnique({
          where: {
            hashedKey,
          },
          select: {
            ...(isRestrictedToken && { scopes: true, ratelimit: true }),
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
          (prismaEdge[tokenTable] as any).update({
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
        session = (await getToken({
          req: req as NextRequest,
          secret: process.env.NEXTAUTH_SECRET,
        })) as unknown as Session;

        if (!session?.user?.id) {
          throw new DubApiError({
            code: "unauthorized",
            message: "Unauthorized: Login required.",
          });
        }
      }

      const workspace = (await prismaEdge.project.findUnique({
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
      })) as WorkspaceProps;

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

      // workspace exists but user is not part of it
      if (workspace.users.length === 0) {
        const pendingInvites = await prismaEdge.projectInvite.findUnique({
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

      // AI usage overage checks
      if (needNotExceededAI && workspace.aiUsage > workspace.aiLimit) {
        throw new DubApiError({
          code: "forbidden",
          message: exceededLimitError({
            plan: workspace.plan,
            limit: workspace.aiLimit,
            type: "AI",
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

      return await handler({
        req,
        params,
        searchParams,
        headers,
        session,
        workspace,
        scopes,
      });
    } catch (error) {
      return handleAndReturnErrorResponse(error, headers);
    }
  };
};
