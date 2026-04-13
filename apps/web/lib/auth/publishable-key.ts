import { captureRequestLog } from "@/lib/api-logs/capture-request-log";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { withAxiom } from "@/lib/axiom/server";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { Project } from "@dub/prisma/client";
import { getSearchParams } from "@dub/utils";
import { headers } from "next/headers";
import { COMMON_CORS_HEADERS } from "../api/cors";

interface WithPublishableKeyHandler {
  ({
    req,
    params,
    searchParams,
    workspace,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    workspace: Project;
  }): Promise<Response>;
}

export const withPublishableKey = (
  handler: WithPublishableKeyHandler,
  {
    requiredPlan = [
      "free",
      "pro",
      "business",
      "business plus",
      "business max",
      "business extra",
      "advanced",
      "enterprise",
    ],
  },
) =>
  withAxiom(
    async (
      req,
      { params: initialParams }: { params: Promise<Record<string, string>> },
    ) => {
      const startTime = Date.now();
      const params = (await initialParams) || {};
      const url = new URL(req.url);
      const reqForLog = req.clone();

      let requestHeaders = await headers();
      let responseHeaders = COMMON_CORS_HEADERS;
      let workspace: Project | null = null;

      try {
        const authorizationHeader = requestHeaders.get("Authorization");
        if (authorizationHeader) {
          if (!authorizationHeader.startsWith("Bearer ")) {
            throw new DubApiError({
              code: "bad_request",
              message: "Invalid or missing publishable key.",
            });
          }

          const publishableKey = authorizationHeader.replace("Bearer ", "");
          if (!publishableKey.startsWith("dub_pk_")) {
            throw new DubApiError({
              code: "bad_request",
              message: "Invalid or missing publishable key.",
            });
          }

          const { success, limit, reset, remaining } = await ratelimit(
            600,
            "1 m",
          ).limit(publishableKey);

          responseHeaders.set("Retry-After", reset.toString());
          responseHeaders.set("X-RateLimit-Limit", limit.toString());
          responseHeaders.set("X-RateLimit-Remaining", remaining.toString());
          responseHeaders.set("X-RateLimit-Reset", reset.toString());

          if (!success) {
            throw new DubApiError({
              code: "rate_limit_exceeded",
              message: "Too many requests.",
            });
          }

          workspace = await prisma.project.findUnique({
            where: {
              publishableKey,
            },
          });

          if (!workspace) {
            throw new DubApiError({
              code: "unauthorized",
              message: "Invalid publishable key.",
            });
          }

          if (!requiredPlan.includes(workspace.plan)) {
            throw new DubApiError({
              code: "forbidden",
              message: "Unauthorized: Need higher plan.",
            });
          }

          const searchParams = getSearchParams(req.url);
          const response = await handler({
            req,
            params,
            searchParams,
            workspace,
          });

          captureRequestLog({
            req: reqForLog,
            response,
            workspace,
            session: undefined,
            token: null,
            url,
            requestHeaders,
            startTime,
          });

          return response;
        } else {
          throw new DubApiError({
            code: "unauthorized",
            message: "Missing publishable key.",
          });
        }
      } catch (error) {
        const errorResponse = handleAndReturnErrorResponse(
          error,
          responseHeaders,
        );

        if (workspace) {
          captureRequestLog({
            req: reqForLog,
            response: errorResponse,
            workspace,
            session: undefined,
            token: null,
            url,
            requestHeaders,
            startTime,
          });
        }

        return errorResponse;
      }
    },
  );
