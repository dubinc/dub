import { createLink, processLink } from "@/lib/api/links";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import z from "@/lib/zod";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";

const schema = z.object({
  api_app_id: z.string(),
  team_id: z.string(),
  text: z.string().transform((text) => text.trim().split(" ")),

  // channel_id: z.string(),
  // channel_name: z.string(),
  // command: z.string(),
  // response_url: z.string(),
  // team_domain: z.string(),
  // token: z.string(),
  // trigger_id: z.string(),
  // user_id: z.string(),
  // user_name: z.string(),
});

// Slack will send an HTTP POST request information to this URL when a user run the command /shorten <url> <key>
export const POST = async (req: Request) => {
  const formData = await req.formData();
  const rawFormData = Object.fromEntries(formData.entries());
  const parsedInput = schema.safeParse(rawFormData);

  if (!parsedInput.success) {
    return new Response("Invalid request");
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
    return new Response("Slack integration not installed on this workspace.");
  }

  if (data.text.length === 0) {
    return new Response("Please provide a destination URL");
  }

  const workspace = await prisma.project.findUniqueOrThrow({
    where: {
      id: installation.projectId,
    },
    select: {
      id: true,
      plan: true,
    },
  });

  const [url, key] = data.text;
  const body = createLinkBodySchema.parse({ url, key });

  const { link, error } = await processLink({
    payload: body,
    workspace: workspace as WorkspaceProps,
    userId: installation.userId,
  });

  if (error != null) {
    return new Response(error);
  }

  const { shortLink } = await createLink(link);

  return new Response(shortLink);
};
