import { createLink, processLink } from "@/lib/api/links";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import z from "@/lib/zod";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";

const schema = z.object({
  api_app_id: z.string(),
  team_id: z.string(),
  text: z.string().transform((text) => text.trim().split(" ")),
});

// Handle `/shorten` command from Slack
export const handleCreateShortLink = async (req: Request) => {
  const formData = await req.formData();
  const rawFormData = Object.fromEntries(formData.entries());
  const parsedInput = schema.safeParse(rawFormData);

  if (!parsedInput.success) {
    return {
      text: "Invalid request.",
    };
  }

  const data = parsedInput.data;

  const installation = await prisma.installedIntegration.findFirst({
    where: {
      integration: {
        slug: "slack",
      },
      AND: [
        {
          credentials: {
            path: "$.team.id",
            equals: data.team_id,
          },
        },
        {
          credentials: {
            path: "$.appId",
            equals: data.api_app_id,
          },
        },
      ],
    },
  });

  if (!installation) {
    return {
      text: "Installation not found.",
    };
  }

  if (data.text.length === 0) {
    return {
      text: "Please provide a destination URL.",
    };
  }

  const [url, key] = data.text;
  const body = createLinkBodySchema.parse({ url, key });

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: installation.projectId,
    },
    select: {
      id: true,
      plan: true,
    },
  });

  const { link, error } = await processLink({
    payload: body,
    workspace: workspace as WorkspaceProps,
    userId: installation.userId,
  });

  if (error != null) {
    return {
      text: error,
    };
  }

  const { shortLink } = await createLink(link);

  return {
    text: shortLink,
  };
};
