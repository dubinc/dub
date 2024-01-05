import { inviteUser } from "@/lib/api/users";
import { getSearchParams } from "@dub/utils";
import jackson from "@/lib/jackson";
import prisma from "@/lib/prisma";
import { ProjectProps } from "@/lib/types";
import type {
  DirectorySyncEvent,
  DirectorySyncRequest,
} from "@boxyhq/saml-jackson";
import { NextResponse } from "next/server";

const handler = async (
  req: Request,
  { params }: { params: Record<string, string> },
) => {
  const authHeader = req.headers.get("Authorization");
  const apiSecret = authHeader ? authHeader.split(" ")[1] : null;

  const query = getSearchParams(req.url);
  const [directoryId, path, resourceId] = params.directory;
  let body;
  try {
    body = await req.json();
  } catch (error) {
    body = {};
  }

  const { directorySyncController } = await jackson();

  // Handle the SCIM API requests
  const request: DirectorySyncRequest = {
    method: req.method,
    body,
    directoryId,
    resourceId,
    resourceType: path === "Users" ? "users" : "groups",
    apiSecret,
    query: {
      count: query.count ? parseInt(query.count as string) : undefined,
      startIndex: query.startIndex
        ? parseInt(query.startIndex as string)
        : undefined,
      filter: query.filter as string,
    },
  };

  const { status, data } = await directorySyncController.requests.handle(
    request,
    handleEvents,
  );

  return NextResponse.json(data, { status });
};

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };

// Handle the SCIM events
const handleEvents = async (event: DirectorySyncEvent) => {
  const { event: action, tenant: projectId, data } = event;

  const project = (await prisma.project.findUnique({
    where: {
      id: projectId,
    },
  })) as ProjectProps;

  if (!project || project.plan !== "enterprise" || !("email" in data)) {
    return;
  }

  const [userInProject, userInvited] = await Promise.all([
    prisma.user.findFirst({
      where: {
        email: data.email,
        projects: {
          some: {
            projectId,
          },
        },
      },
    }),
    await prisma.projectInvite.findUnique({
      where: {
        email_projectId: {
          email: data.email,
          projectId,
        },
      },
    }),
  ]);

  // User has been activated for the first time
  if (action === "user.created" && !userInProject && !userInvited) {
    await inviteUser({
      email: data.email,
      project,
    });
  }

  // User has been activated
  if (
    action === "user.updated" &&
    // @ts-ignore – data.active can be a string (from Azure AD)
    (data.active === true || data.active === "True")
  ) {
    if (!userInProject && !userInvited) {
      await inviteUser({
        email: data.email,
        project,
      });
    }
  }

  // User has been deactivated or deleted
  if (
    (action === "user.updated" &&
      // @ts-ignore – data.active can be a string (from Azure AD)
      (data.active === false || data.active === "False")) ||
    action === "user.deleted"
  ) {
    if (userInProject) {
      await prisma.projectUsers.delete({
        where: {
          userId_projectId: {
            userId: userInProject.id,
            projectId,
          },
        },
      });
    }
    if (userInvited) {
      await prisma.projectInvite.delete({
        where: {
          email_projectId: {
            email: data.email,
            projectId,
          },
        },
      });
    }
  }
  return;
};
