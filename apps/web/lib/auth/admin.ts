import { prisma } from "@dub/prisma";
import { WorkspaceRole } from "@dub/prisma/client";
import { DUB_WORKSPACE_ID, getSearchParams } from "@dub/utils";
import { getSession } from "./utils";

// Internal use only (for admin portal)
interface WithAdminHandler {
  ({
    req,
    params,
    searchParams,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
  }): Promise<Response>;
}

const getDubAdminRole = async (userId: string) => {
  const response = await prisma.projectUsers.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: DUB_WORKSPACE_ID,
      },
    },
    select: {
      role: true,
    },
  });
  if (!response) {
    return null;
  }
  return response.role;
};

export const withAdmin =
  (
    handler: WithAdminHandler,
    { requiredRoles = [] }: { requiredRoles?: WorkspaceRole[] } = {},
  ) =>
  async (
    req: Request,
    { params: initialParams }: { params: Promise<Record<string, string>> },
  ) => {
    const params = (await initialParams) || {};
    const session = await getSession();
    if (!session?.user) {
      return new Response("Unauthorized: Login required.", { status: 401 });
    }

    const adminRole = await getDubAdminRole(session.user.id);
    if (!adminRole) {
      return new Response("Unauthorized: Not an admin.", { status: 401 });
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(adminRole)) {
      return new Response(
        `Unauthorized: Missing required admin role(s): ${requiredRoles.join(", ")}.`,
        { status: 403 },
      );
    }

    const searchParams = getSearchParams(req.url);
    return handler({ req, params, searchParams });
  };
