import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import prisma from "#/lib/prisma";
import { type Link as LinkProps } from "@prisma/client";
import { PlanProps, ProjectProps, UserProps } from "#/lib/types";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { createHash } from "crypto";

export interface Session {
  user: {
    email: string;
    id: string;
    name: string;
  };
}

export async function getSession(req: NextApiRequest, res: NextApiResponse) {
  // @ts-ignore
  return (await getServerSession(req, res, authOptions)) as Session;
}

export const hashToken = (token: string) => {
  return createHash("sha256")
    .update(`${token}${process.env.NEXTAUTH_SECRET}`)
    .digest("hex");
};
interface WithProjectNextApiHandler {
  (
    req: NextApiRequest,
    res: NextApiResponse,
    project: ProjectProps,
    session: Session,
  ): any;
}

const withProjectAuth =
  (
    handler: WithProjectNextApiHandler,
    {
      excludeGet, // if the action doesn't need to be gated for GET requests
      requiredPlan = ["free", "pro", "enterprise"], // if the action needs a specific plan
      requiredRole = ["owner", "member"],
      needNotExceededUsage, // if the action needs the user to not have exceeded their usage
    }: {
      excludeGet?: boolean;
      requiredPlan?: Array<PlanProps>;
      requiredRole?: Array<"owner" | "member">;
      needNotExceededUsage?: boolean;
    } = {},
  ) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    if (!session?.user.id)
      return res.status(401).end("Unauthorized: Login required.");

    const { slug } = req.query;
    if (!slug || typeof slug !== "string") {
      return res.status(400).end("Missing or misconfigured project slug.");
    }

    const project = (await prisma.project.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        usage: true,
        usageLimit: true,
        plan: true,
        stripeId: true,
        billingCycleStart: true,
        createdAt: true,
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
      },
    })) as ProjectProps;

    if (project && project.users) {
      // project exists but user is not part of it
      if (project.users.length === 0) {
        const pendingInvites = await prisma.projectInvite.findUnique({
          where: {
            email_projectId: {
              email: session.user.email,
              projectId: project.id,
            },
          },
          select: {
            expires: true,
          },
        });
        if (!pendingInvites) {
          return res.status(404).end("Project not found.");
        } else if (pendingInvites.expires < new Date()) {
          return res.status(410).end("Project invite expired.");
        } else {
          return res.status(409).end("Project invite pending.");
        }
      }
    } else {
      // project doesn't exist
      return res.status(404).end("Project not found.");
    }

    // if the action doesn't need to be gated for GET requests, return handler now
    if (req.method === "GET" && excludeGet) {
      return handler(req, res, project, session);
    }

    if (
      project.plan === "enterprise" &&
      !requiredRole.includes(project.users[0].role)
    ) {
      return res.status(403).end("Unauthorized: Insufficient permissions.");
    }

    if (needNotExceededUsage && project.usage > project.usageLimit) {
      return res.status(403).end("Unauthorized: Usage limits exceeded.");
    }

    if (!requiredPlan.includes(project.plan)) {
      return res.status(403).end("Unauthorized: Need higher plan.");
    }

    return handler(req, res, project, session);
  };

export { withProjectAuth };

interface WithUsertNextApiHandler {
  (
    req: NextApiRequest,
    res: NextApiResponse,
    session: Session,
    user?: UserProps,
  ): any;
}

const withUserAuth =
  (
    handler: WithUsertNextApiHandler,
    {
      needUserDetails, // if the action needs the user's details
    }: {
      needUserDetails?: boolean;
    } = {},
  ) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    if (!session?.user.id)
      return res.status(401).end("Unauthorized: Login required.");

    if (req.method === "GET") return handler(req, res, session);

    if (needUserDetails) {
      const user = (await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })) as UserProps;

      return handler(req, res, session, user);
    }

    return handler(req, res, session);
  };

export { withUserAuth };

interface WithLinksAuthNextApiHandler {
  (
    req: NextApiRequest,
    res: NextApiResponse,
    session: Session,
    project?: ProjectProps,
    domain?: string,
    link?: LinkProps,
  ): any;
}

/* 
  This is the auth handler for all link-related actions.

  In the future, we might want to combine this with other endpoints as well (e.g. /projects, /domains, etc.)
  
  Here's an outline of the flow:
  1. Check if user is logged in, if not, return 401 right away.
  2. Check if there's a `slug` in the query params:
    a. If there is no slug, it means that it's the generic dub.sh links
      i. Make sure the domain is `dub.sh` (prevent query injection)
      ii. If link `key` is provided, make sure user is the owner of the link
    b. If there is a slug, it means that it's a custom project
      i. Make sure the project exists
      ii. Make sure the user is part of the project
      iii. Make sure the project is within its usage limits
      iv. Make sure the action is allowed for the project's plan
      v. Make sure the domain is part of the project (prevent query injection)
*/

const withLinksAuth =
  (
    handler: WithLinksAuthNextApiHandler,
    {
      needNotExceededUsage, // if the action needs the user to not have exceeded their usage
      excludeGet, // if the action doesn't need to be gated for GET requests
      requiredPlan = ["free", "pro", "enterprise"], // if the action needs a specific plan
      skipKeyCheck, // if the action doesn't need to check if the user is the owner of the link (/exists endpoint)
    }: {
      needNotExceededUsage?: boolean;
      excludeGet?: boolean;
      requiredPlan?: Array<PlanProps>;
      skipKeyCheck?: boolean;
    } = {},
  ) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    // console.log("Running withLinksAuth helper for endpoint: ", req.url);

    const session = await getSession(req, res);
    if (!session?.user.id) {
      return res.status(401).end("Unauthorized: Login required.");
    }

    const { slug, domain } = req.query as {
      slug?: string;
      domain?: string;
    };

    // if slug is misconfgured
    if (slug && typeof slug !== "string") {
      return res.status(400).end("Missing or misconfigured project slug.");
    }

    let project: ProjectProps | undefined;
    let link: LinkProps | undefined;

    // if there is no slug, it's the default dub.sh link
    if (!slug) {
      // prevent domain from being query injected by
      // making sure that all instances of `domain` are `dub.sh`
      if (
        (domain && domain !== "dub.sh") ||
        (req.body.domain && req.body.domain !== "dub.sh")
      ) {
        return res.status(403).end("Unauthorized: Invalid domain.");
      }

      // if project slug is defined, that means it's a custom project on Dub
    } else {
      project = (await prisma.project.findUnique({
        where: {
          slug,
        },
        include: {
          domains: {
            select: {
              slug: true,
            },
          },
          users: {
            where: {
              userId: session.user.id,
            },
            select: {
              role: true,
            },
          },
        },
      })) as ProjectProps;

      // if project doesn't exist
      if (!project) {
        return res.status(404).end("Project not found.");

        // if project exists but user is not part of it
      } else if (project.users && project.users.length === 0) {
        // TODO: check if user has pending invite
        return res.status(401).end("Unauthorized: Not part of project.");

        // project exists and user is part of it
      } else {
        // if the action requires the project to be within usage limits,
        // and the action is not a GET request with excludeGet set to true,
        // check if the project is within usage limits
        if (
          needNotExceededUsage &&
          !(req.method === "GET" && excludeGet) &&
          project.usage > project.usageLimit
        ) {
          return res.status(403).end("Unauthorized: Usage limits exceeded.");
        }

        if (requiredPlan && !requiredPlan.includes(project.plan)) {
          return res.status(403).end("Unauthorized: Need higher plan.");
        }

        // prevent unauthorized access to domains
        if (
          (domain && !project.domains?.find((d) => d.slug === domain)) ||
          (req.body.domain &&
            !project.domains?.find((d) => d.slug === req.body.domain))
        ) {
          return res.status(403).end("Unauthorized: Invalid domain.");
        }
      }
    }

    // if key is defined, check if the  current user is the owner of the link (only for dub.sh links)
    const { key } = req.query;
    if (key && !domain && !skipKeyCheck) {
      if (typeof key !== "string") {
        return res.status(400).end("Missing or misconfigured link key.");
      }
      link =
        (await prisma.link.findUnique({
          where: {
            domain_key: {
              domain: domain || "dub.sh",
              key,
            },
          },
        })) || undefined;
      if (!link) {
        return res.status(404).end("Link not found.");

        // for dub.sh links, check if the user is the owner of the link
      } else if (!slug && link.userId !== session.user.id) {
        return res.status(404).end("Link not found.");
      }
    }

    return handler(req, res, session, project, domain, link);
  };

export { withLinksAuth };
