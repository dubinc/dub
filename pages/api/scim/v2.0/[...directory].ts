import type { NextApiRequest, NextApiResponse } from "next";
import jackson from "#/lib/jackson";
import prisma from "#/lib/prisma";
import type {
  DirectorySyncEvent,
  DirectorySyncRequest,
} from "@boxyhq/saml-jackson";

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
  console.log({ action, projectId, data });

  // User has been created
  if (action === "user.created" && "email" in data) {
    // const user = await prisma.user.upsert({
    //   where: {
    //     email: data.email,
    //   },
    //   update: {
    //     name: `${data.first_name} ${data.last_name}`,
    //   },
    //   create: {
    //     name: `${data.first_name} ${data.last_name}`,
    //     email: data.email,
    //   },
    // });
    // add to team
  }

  // User has been updated
  if (action === "user.updated" && "email" in data) {
    if (data.active === true) {
      const user = await prisma.user.upsert({
        where: {
          email: data.email,
        },
        update: {
          name: `${data.first_name} ${data.last_name}`,
        },
        create: {
          name: `${data.first_name} ${data.last_name}`,
          email: data.email,
        },
      });

      // add to team

      return;
    }

    // const user = await getUser({ email: data.email });

    // if (!user) {
    //   return;
    // }

    // if (data.active === false) {
    //   await deleteUser({ id: user.id });
    // }
  }

  // User has been removed
  if (action === "user.deleted" && "email" in data) {
    // await deleteUser({ email: data.email });
  }
};
