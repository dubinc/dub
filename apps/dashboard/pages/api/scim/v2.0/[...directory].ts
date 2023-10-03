import type { NextApiRequest, NextApiResponse } from "next";
import jackson from "#/lib/jackson";
import prisma from "#/lib/prisma";
import type {
  DirectorySyncEvent,
  DirectorySyncRequest,
} from "@boxyhq/saml-jackson";
import { inviteUser } from "#/lib/api/users";
import { ProjectProps } from "#/lib/types";

// Fetch the auth token from the request headers
export const extractAuthToken = (req: NextApiRequest): string | null => {
  const authHeader = req.headers.authorization || null;

  return authHeader ? authHeader.split(" ")[1] : null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { directorySyncController } = await jackson();

  const { method, query, body } = req;

  const directory = query.directory as string[];
  const [directoryId, path, resourceId] = directory;

  // Handle the SCIM API requests
  const request: DirectorySyncRequest = {
    method: method as string,
    body: body ? JSON.parse(body) : undefined,
    directoryId,
    resourceId,
    resourceType: path === "Users" ? "users" : "groups",
    apiSecret: extractAuthToken(req),
    query: {
      count: req.query.count ? parseInt(req.query.count as string) : undefined,
      startIndex: req.query.startIndex
        ? parseInt(req.query.startIndex as string)
        : undefined,
      filter: req.query.filter as string,
    },
  };

  const { status, data } = await directorySyncController.requests.handle(
    request,
    handleEvents,
  );

  res.status(status).json(data);
}

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
