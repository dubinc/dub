import { prisma } from "@dub/prisma";
import { tool } from "ai";
import { z } from "zod";
import { getSession } from "../auth/utils";

const workspaceDetailsSchema = z.object({
  name: z.string().describe("The name of the workspace."),
  slug: z.string().describe("The slug of the workspace."),
  logo: z.string().describe("The logo of the workspace."),
  plan: z
    .enum(["free", "pro", "business", "advanced", "enterprise"])
    .describe("The plan of the workspace."),
  billingCycleStart: z
    .number()
    .describe("The day of the month when the billing cycle starts."),
  paymentFailedAt: z
    .date()
    .nullable()
    .describe("The date and time the payment failed at."),
  usage: z
    .number()
    .describe(
      "The tracked events usage that the workspace has used for the current billing cycle.",
    ),
  usageLimit: z
    .number()
    .describe(
      "The total tracked events that the workspace has for the current billing cycle.",
    ),
  linksUsage: z
    .number()
    .describe(
      "The amount of links that the workspace has created for the current billing cycle.",
    ),
  linksLimit: z
    .number()
    .describe(
      "The total amount of links that the workspace can create for the current billing cycle.",
    ),
});

export const getWorkspaceDetailsTool = tool({
  description:
    "Retrives the details of a given user's workspace (plan, usage, etc.).",
  inputSchema: z.object({
    workspaceId: z.string().describe("The unique ID of the workspace."),
  }),
  outputSchema: workspaceDetailsSchema,
  execute: async ({ workspaceId }) => {
    const session = await getSession();
    if (!session?.user.id) {
      return {
        error: "Unauthorized. Please log in to continue.",
      };
    }
    const workspace = await prisma.project.findUnique({
      where: {
        id: workspaceId,
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });
    if (!workspace) {
      return {
        error: "Workspace not found",
      };
    }
    return workspaceDetailsSchema.parse(workspace);
  },
});
