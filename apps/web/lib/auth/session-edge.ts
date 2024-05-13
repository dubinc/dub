import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSearchParams } from "@dub/utils";
import { Project } from "@prisma/client";
import { internal_runWithWaitUntil as waitUntil } from "next/dist/server/web/internal-edge-wait-until";
import {
  getToken,
  getWorkspaceById,
  getWorkspaceBySlug,
  updateTokenLastUsed,
} from "../planetscale";
import { ratelimit } from "../upstash";
import { hashToken } from "./hash-token";

interface Handler {
  ({ req, workspace }: { req: Request; workspace: Project }): Promise<Response>;
}

export const withSessionEdge =
  (handler: Handler) =>
  async (req: Request, { params }: { params: Record<string, string> }) => {
    let headers = {};
    let workspace: Project | null = null;
    const searchParams = getSearchParams(req.url);
    const authorizationHeader = req.headers.get("Authorization");

    try {
      if (!authorizationHeader) {
        throw new DubApiError({
          code: "bad_request",
          message:
            "Missing authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth",
        });
      }

      if (authorizationHeader) {
        if (!authorizationHeader.includes("Bearer ")) {
          throw new DubApiError({
            code: "bad_request",
            message:
              "Misconfigured authorization header. Did you forget to add 'Bearer '? Learn more: https://d.to/auth",
          });
        }
      }

      const apiKey = authorizationHeader.replace("Bearer ", "");
      const hashedKey = await hashToken(apiKey);
      const user = await getToken(hashedKey);

      if (!user) {
        throw new DubApiError({
          code: "unauthorized",
          message: "Unauthorized: Invalid API key.",
        });
      }

      // Check rate limit
      const { success, limit, reset, remaining } = await ratelimit(
        600,
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

      // Fetch workspace
      const idOrSlug =
        params?.idOrSlug ||
        searchParams.workspaceId ||
        params?.slug ||
        searchParams.projectSlug;

      if (!idOrSlug) {
        throw new DubApiError({
          code: "not_found",
          message:
            "Workspace id not found. Did you forget to include a `workspaceId` query parameter? Learn more: https://d.to/id",
        });
      }

      if (idOrSlug.startsWith("ws_")) {
        workspace = await getWorkspaceById(idOrSlug);
      } else {
        workspace = await getWorkspaceBySlug(idOrSlug);
      }

      // TODO:
      // Check user/apiKey has access to workspace

      if (!workspace) {
        throw new DubApiError({
          code: "not_found",
          message: "Workspace not found.",
        });
      }

      // Update token last used
      waitUntil(() => updateTokenLastUsed(hashedKey));

      return await handler({ req, workspace });
    } catch (error) {
      return handleAndReturnErrorResponse(error, headers);
    }
  };
