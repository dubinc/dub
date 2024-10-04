import { createLink, processLink } from "@/lib/api/links";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import z from "@/lib/zod";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";
import { SLACK_INTEGRATION_ID } from "@dub/utils";
import { SlackCredential } from "./type";
import { verifySlackSignature } from "./verify-request";

const schema = z.object({
  api_app_id: z.string(),
  team_id: z.string(),
  user_id: z.string(),
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
      integrationId: SLACK_INTEGRATION_ID,
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

  // Find Dub user matching the Slack user profile
  const credentials = installation.credentials as SlackCredential;
  let slackUser: undefined | { email: string };

  try {
    slackUser = await findSlackUser({
      userId: data.user_id,
      credentials,
    });
  } catch (error: any) {
    return {
      text: `Error fetching user profile: ${error.message}`,
    };
  }

  const dubUser = await prisma.user.findUnique({
    where: {
      email: slackUser?.email,
    },
    select: {
      id: true,
    },
  });

  if (!dubUser) {
    return {
      text: "Unable to find Dub account matching your Slack account. Only Dub users can use this command.",
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
    return createShortLink({ data, workspace, userId: dubUser.id });
  }

  return {
    text: "Invalid command.",
  };
};

// Find Dub user for the given Slack user
// TODO: Cache the profile for better performance
const findSlackUser = async ({
  userId,
  credentials,
}: {
  userId: string;
  credentials: SlackCredential;
}) => {
  const response = await fetch(
    `https://slack.com/api/users.profile.get?user=${userId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${credentials.accessToken}`,
      },
    },
  );

  const slackUser = await response.json();

  if (!slackUser.ok) {
    throw new Error(slackUser.error);
  }

  return slackUser.profile as { email: string };
};

// Handle `/shorten` command from Slack
const createShortLink = async ({
  data,
  workspace,
  userId,
}: {
  data: z.infer<typeof schema>;
  workspace: Pick<WorkspaceProps, "id" | "plan">;
  userId: string;
}) => {
  const [url, key, domain] = data.text;
  const body = createLinkBodySchema.parse({ url, key, domain });

  const { link, error } = await processLink({
    payload: body,
    workspace: workspace as WorkspaceProps,
    userId,
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
