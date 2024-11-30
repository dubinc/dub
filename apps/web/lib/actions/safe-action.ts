import { createSafeActionClient } from "next-safe-action";
import { getSession } from "../auth";
import { prisma } from "../prisma";

export const actionClient = createSafeActionClient({
  handleServerError: (e) => {
    console.error("Server action error:", e);

    if (e instanceof Error) {
      return e.message;
    }

    return "An unknown error occurred.";
  },
});

export const authUserActionClient = actionClient.use(async ({ next }) => {
  const session = await getSession();

  if (!session?.user.id) {
    throw new Error("Unauthorized: Login required.");
  }

  return next({
    ctx: {
      user: session.user,
    },
  });
});

export const authActionClient = actionClient.use(
  async ({ next, clientInput }) => {
    const session = await getSession();

    if (!session?.user.id) {
      throw new Error("Unauthorized: Login required.");
    }

    // @ts-ignore
    let workspaceId = clientInput?.workspaceId;

    if (!workspaceId) {
      throw new Error("WorkspaceId is required.");
    }

    workspaceId = workspaceId.replace("ws_", "");

    const workspace = await prisma.project.findUnique({
      where: {
        id: workspaceId,
      },
      include: {
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (!workspace || !workspace.users) {
      throw new Error("Workspace not found.");
    }

    return next({
      ctx: {
        user: session.user,
        workspace,
      },
    });
  },
);

export const authPartnerActionClient = actionClient.use(
  async ({ next, clientInput }) => {
    const session = await getSession();

    if (!session?.user.id) {
      throw new Error("Unauthorized: Login required.");
    }

    // @ts-ignore
    let partnerId = clientInput?.partnerId;

    if (!partnerId) {
      throw new Error("PartnerId is required.");
    }

    const partner = await prisma.partner.findUnique({
      where: {
        id: partnerId,
      },
      include: {
        users: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!partner || !partner.users) {
      throw new Error("Partner not found.");
    }

    return next({
      ctx: {
        user: session.user,
        partner,
      },
    });
  },
);
