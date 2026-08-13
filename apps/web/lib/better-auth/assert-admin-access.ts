import { prisma } from "@/lib/prisma";
import { ADMIN_HOSTNAMES, DUB_WORKSPACE_ID } from "@dub/utils";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";

// Admin portal login must not mint a session for non-members of the Dub workspace.
export async function assertAdminAccess(userId: string) {
  const hostname = (await headers()).get("host");
  if (!hostname || !ADMIN_HOSTNAMES.has(hostname)) {
    return;
  }

  const workspaceUser = await prisma.projectUsers.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: DUB_WORKSPACE_ID,
      },
    },
    select: {
      userId: true,
    },
  });

  if (workspaceUser) {
    return;
  }

  throw new APIError("FORBIDDEN", {
    message: "Unable to sign in with this account.",
  });
}
