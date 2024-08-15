import { createLink, processLink } from "@/lib/api/links";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import z from "@/lib/zod";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";
import { InstalledIntegration } from "@prisma/client";
import { verifySlackSignature } from "./verify-request";

const schema = z.object({
  api_app_id: z.string(),
  team_id: z.string(),
  text: z.string().transform((text) => text.trim().split(" ")),
  command: z.enum(["/shorten"]),
});

// Handle slash command from Slack
export const handleSlashCommand = async (
  req: Request,
): Promise<{ text: string }> => {
  const body = await req.text();

  await verifySlackSignature(req, body);

  const rawFormData = new URLSearchParams(body);
  const formData = Object.fromEntries(rawFormData.entries());
  const parsedInput = schema.safeParse(formData);

  if (!parsedInput.success) {
    return {
      text: "Invalid request.",
    };
  }

  const data = parsedInput.data;

  const installation = await prisma.installedIntegration.findFirst({
    where: {
      integrationId: "clzu59rx9000110bm5fnlzwuj",
      credentials: {
        path: "$.team.id",
        equals: data.team_id,
      },
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

  const workspace = (await prisma.project.findUniqueOrThrow({
    where: {
      id: installation.projectId,
    },
    select: {
      id: true,
      plan: true,
    },
  })) as WorkspaceProps;

  if (data.command === "/shorten") {
    return createShortLink({ data, workspace, installation });
  }

  return {
    text: "Invalid command.",
  };
};

// Handle `/shorten` command from Slack
const createShortLink = async ({
  data,
  workspace,
  installation,
}: {
  data: z.infer<typeof schema>;
  workspace: Pick<WorkspaceProps, "id" | "plan">;
  installation: InstalledIntegration;
}) => {
  const [url, key, domain] = data.text;
  const body = createLinkBodySchema.parse({ url, key, domain });

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
