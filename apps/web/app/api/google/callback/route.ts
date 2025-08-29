import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { googleOAuth } from "@/lib/google-ads/oauth";
import { installIntegration } from "@/lib/integrations/install";
import { getSlackEnv } from "@/lib/integrations/slack/env";
import z from "@/lib/zod";
import { prisma } from "@dub/prisma";
import { Project } from "@dub/prisma/client";
import { getSearchParams, GOOGLE_ADS_INTEGRATION_ID } from "@dub/utils";
import { redirect } from "next/navigation";

const schema = z.object({
  code: z.string(),
  state: z.string(),
});

// GET - /api/google/callback
export const GET = async (req: Request) => {
  const env = getSlackEnv();

  let workspace: Pick<
    Project,
    "id" | "slug" | "plan" | "conversionEnabled"
  > | null = null;

  try {
    const session = await getSession();

    if (!session?.user.id) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Unauthorized",
      });
    }

    const { code, state } = schema.parse(getSearchParams(req.url));

    const workspaceId = await googleOAuth.getState({
      state,
    });

    if (!workspaceId) {
      throw new DubApiError({
        code: "bad_request",
        message: "Unknown state.",
      });
    }

    workspace = await prisma.project.findUniqueOrThrow({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        slug: true,
        plan: true,
        conversionEnabled: true,
      },
    });

    if (!workspace.conversionEnabled) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "This integration can only be used with a workspace that has conversion tracking enabled.",
      });
    }

    const credentials = await googleOAuth.exchangeCodeForToken({
      code,
    });

    await installIntegration({
      integrationId: GOOGLE_ADS_INTEGRATION_ID,
      userId: session.user.id,
      workspaceId,
      credentials: {
        // store the credentials in the database
      },
    });
  } catch (e: any) {
    return handleAndReturnErrorResponse(e);
  }

  redirect(`${workspace?.slug}/settings/integrations/google-ads`);
};
