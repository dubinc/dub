import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import {
  AddOns,
  BetaFeatures,
  PlanProps,
  WorkspaceWithUsers,
} from "@/lib/types";
import { ratelimit } from "@/lib/upstash";
import { API_DOMAIN, getSearchParams } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { AxiomRequest, withAxiom } from "next-axiom";
import {
  PermissionAction,
  getPermissionsByRole,
} from "../api/rbac/permissions";
import { throwIfNoAccess } from "../api/tokens/permissions";
import { Scope, mapScopesToPermissions } from "../api/tokens/scopes";
import { getFeatureFlags } from "../edge-config";
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
    permissions,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    headers?: Record<string, string>;
    session: Session;
    permissions: PermissionAction[];
    workspace: WorkspaceWithUsers;
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
    requiredAddOn,
    allowAnonymous, // special case for /api/links (POST /api/links) – allow no session
    featureFlag, // if the action needs a specific feature flag
    requiredPermissions = [],
    skipPermissionChecks, // if the action doesn't need to check for required permission(s)
  }: {
    requiredPlan?: Array<PlanProps>;
    requiredAddOn?: AddOns;
    allowAnonymous?: boolean;
    featureFlag?: BetaFeatures;
    requiredPermissions?: PermissionAction[];
    skipPermissionChecks?: boolean;
  } = {},
) => {
  return withAxiom(
    async (
      req: AxiomRequest,
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
        let permissions: PermissionAction[] = [];
        let token: any | null = null;
        const isRestrictedToken = apiKey?.startsWith("dub_");

        const idOrSlug =
          params?.idOrSlug ||
          searchParams.workspaceId ||
          params?.slug ||
          searchParams.projectSlug;

        // if there's no workspace ID or slug and it's not a restricted token
        // For restricted tokens, we find the workspaceId from the token
        if (!idOrSlug && !isRestrictedToken) {
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
                "Workspace ID not found. Did you forget to include a `workspaceId` query parameter? It looks like you might be using personal API keys, we also recommend refactoring to workspace API keys: https://d.to/keys",
            });
          }
        }

        if (idOrSlug) {
          if (idOrSlug.startsWith("ws_")) {
            workspaceId = idOrSlug.replace("ws_", "");
          } else {
            workspaceSlug = idOrSlug;
          }
        }

        if (apiKey) {
          const hashedKey = await hashToken(apiKey);
          const prismaArgs = {
            where: {
              hashedKey,
            },
            select: {
              ...(isRestrictedToken && {
                scopes: true,
                rateLimit: true,
                projectId: true,
                expires: true,
              }),
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  isMachine: true,
                },
              },
            },
          };

          if (isRestrictedToken) {
            token = await prisma.restrictedToken.findUnique(prismaArgs);
          } else {
            token = await prisma.token.findUnique(prismaArgs);
          }

          if (!token || !token.user) {
            throw new DubApiError({
              code: "unauthorized",
              message: "Unauthorized: Invalid API key.",
            });
          }

          if (token.expires && token.expires < new Date()) {
            throw new DubApiError({
              code: "unauthorized",
              message: "Unauthorized: Access token expired.",
            });
          }

          // Rate limit checks for API keys
          const rateLimit = token.rateLimit || 600;

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

          // Find workspaceId if it's a restricted token
          if (isRestrictedToken) {
            workspaceId = token.projectId;
          }

          waitUntil(
            // update last used time for the token
            (async () => {
              const prismaArgs = {
                where: {
                  hashedKey,
                },
                data: {
                  lastUsed: new Date(),
                },
              };

              if (isRestrictedToken) {
                await prisma.restrictedToken.update(prismaArgs);
              } else {
                await prisma.token.update(prismaArgs);
              }
            })(),
          );

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

        const workspace = (await prisma.project.findUnique({
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
          },
        })) as WorkspaceWithUsers;

        // workspace doesn't exist
        if (!workspace || !workspace.users) {
          throw new DubApiError({
            code: "not_found",
            message: "Workspace not found.",
          });
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

        // Machine users have owner role by default
        // Only workspace owners can create machine users
        if (session.user.isMachine) {
          workspace.users[0].role = "owner";
        }

        permissions = getPermissionsByRole(workspace.users[0].role);

        // Find the subset of permissions that the user has access to based on the token scopes
        if (isRestrictedToken) {
          const tokenScopes: Scope[] = token.scopes.split(" ") || [];
          permissions = mapScopesToPermissions(tokenScopes).filter((p) =>
            permissions.includes(p),
          );
        }

        // Check user has permission to make the action
        if (!skipPermissionChecks) {
          throwIfNoAccess({
            permissions,
            requiredPermissions,
            workspaceId: workspace.id,
          });
        }

        // beta feature checks
        if (featureFlag) {
          const flags = await getFeatureFlags({ workspaceId: workspace.id });

          if (!flags[featureFlag]) {
            throw new DubApiError({
              code: "forbidden",
              message: "Unauthorized: Beta feature.",
            });
          }
        }

        const url = new URL(req.url || "", API_DOMAIN);

        // plan checks
        // special scenario – /events and /webhooks API is available for conversionEnabled workspaces (even if they're on a Pro plan)
        if (
          !requiredPlan.includes(workspace.plan) &&
          (url.pathname.includes("/events") ||
            url.pathname.includes("/webhooks")) &&
          !workspace.conversionEnabled
        ) {
          throw new DubApiError({
            code: "forbidden",
            message: "Unauthorized: Need higher plan.",
          });
        }

        // add-ons checks
        if (requiredAddOn && !workspace[`${requiredAddOn}Enabled`]) {
          throw new DubApiError({
            code: "forbidden",
            message:
              "Unauthorized: This feature is not available on your plan.",
          });
        }

        // analytics API checks
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
          permissions,
        });
      } catch (error) {
        req.log.error(error);
        return handleAndReturnErrorResponse(error, headers);
      }
    },
  );
};
