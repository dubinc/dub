import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimit } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import { Project } from "@prisma/client";
import { AxiomRequest, withAxiom } from "next-axiom";
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
      req: AxiomRequest,
      { params: initialParams }: { params: Promise<Record<string, string>> },
    ) => {
      const params = (await initialParams) || {};
      let headersList = await headers();

      try {
        const authorizationHeader = headersList.get("Authorization");
        if (authorizationHeader) {
          if (!authorizationHeader.includes("Bearer ")) {
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

          headersList.set("Retry-After", reset.toString());
          headersList.set("X-RateLimit-Limit", limit.toString());
          headersList.set("X-RateLimit-Remaining", remaining.toString());
          headersList.set("X-RateLimit-Reset", reset.toString());
          Object.assign(COMMON_CORS_HEADERS, headersList);

          if (!success) {
            return new Response("Too many requests.", {
              status: 429,
              headers: headersList,
            });
          }

          const workspace = await prisma.project.findUnique({
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
          return await handler({ req, params, searchParams, workspace });
        } else {
          throw new DubApiError({
            code: "unauthorized",
            message: "Missing publishable key.",
          });
        }
      } catch (error) {
        req.log.error(error);
        return handleAndReturnErrorResponse(error, headersList);
      }
    },
  );
