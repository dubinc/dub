import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { encrypt } from "@/lib/encryption";
import { installIntegration } from "@/lib/integrations/install";
import { Intercom } from "@/lib/integrations/intercom/client";
import { intercomOAuthProvider } from "@/lib/integrations/intercom/oauth";
import { intercomCredentialsSchema } from "@/lib/integrations/intercom/schema";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { INTERCOM_INTEGRATION_ID } from "@dub/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// GET /api/intercom/callback - OAuth callback from Intercom
export const GET = async (req: Request) => {
  const { searchParams } = new URL(req.url);

  if (
    process.env.NODE_ENV === "development" &&
    !req.headers.get("host")?.includes("localhost")
  ) {
    return redirect(
      `http://localhost:8888/api/intercom/callback?${searchParams.toString()}`,
    );
  }

  let workspace:
    | (Pick<WorkspaceProps, "id" | "slug" | "users"> & { plan: string })
    | null = null;

  try {
    const session = await getSession();

    if (!session?.user.id) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Unauthorized. Please login to continue.",
      });
    }

    const { token, contextId: workspaceId } =
      await intercomOAuthProvider.exchangeCodeForToken<string>(req);

    workspace = await prisma.project.findUniqueOrThrow({
      where: {
        id: workspaceId,
      },
      select: {
        id: true,
        slug: true,
        plan: true,
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
            defaultFolderId: true,
          },
        },
      },
    });

    if (workspace.users.length === 0) {
      throw new DubApiError({
        code: "bad_request",
        message: "You are not a member of this workspace.",
      });
    }

    if (workspace.users[0].role !== "owner") {
      throw new DubApiError({
        code: "bad_request",
        message: "Only workspace owners can install integrations.",
      });
    }

    if (!getPlanCapabilities(workspace.plan).canInstallAdvancedIntegrations) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Intercom integration is only available on Advanced and Enterprise plans.",
      });
    }

    const integration = await prisma.integration.findUniqueOrThrow({
      where: {
        id: INTERCOM_INTEGRATION_ID,
      },
      select: {
        id: true,
      },
    });

    const intercom = new Intercom({
      token: token.access_token,
    });

    const admin = await intercom.getAdmin();

    if (!admin.app?.id_code) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Failed to retrieve Intercom workspace ID.",
      });
    }

    const credentials = intercomCredentialsSchema.parse({
      accessToken: encrypt(token.access_token),
      appId: admin.app?.id_code,
    });

    await installIntegration({
      integrationId: integration.id,
      userId: session.user.id,
      workspaceId,
      credentials,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }

  redirect(`/${workspace.slug}/settings/integrations/intercom`);
};
