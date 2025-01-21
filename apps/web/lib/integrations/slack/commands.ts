import { createLink, processLink } from "@/lib/api/links";
import { WorkspaceProps } from "@/lib/types";
import z from "@/lib/zod";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";
import { User } from "@dub/prisma/client";
import { APP_DOMAIN, SLACK_INTEGRATION_ID } from "@dub/utils";
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
export const handleSlashCommand = async (req: Request) => {
  const body = await req.text();

  await verifySlackSignature(req, body);

  const rawFormData = new URLSearchParams(body);
  const formData = Object.fromEntries(rawFormData.entries());
  const parsedInput = schema.safeParse(formData);

  if (!parsedInput.success) {
    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: "Invalid request.",
          },
        },
      ],
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
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: "Installation not found.",
          },
        },
      ],
    };
  }

  if (data.text.length === 0) {
    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: "Please provide a destination URL.",
          },
        },
      ],
    };
  }

  // Find Dub user matching the Slack user profile
  const credentials = installation.credentials as SlackCredential;
  const slackUser = await findSlackUser({
    userId: data.user_id,
    credentials,
  });

  const dubUser = await prisma.user.findUnique({
    where: {
      email: slackUser?.email,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!dubUser) {
    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: "Unable to find Dub account matching your Slack account. Only Dub users can use this command.",
          },
        },
      ],
    };
  }

  const workspace = (await prisma.project.findUniqueOrThrow({
    where: {
      id: installation.projectId,
    },
    select: {
      id: true,
      plan: true,
      slug: true,
    },
  })) as WorkspaceProps;

  if (data.command === "/shorten") {
    return createShortLink({
      data,
      workspace,
      user: dubUser,
    });
  }

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "Invalid command.",
        },
      },
    ],
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
  user,
}: {
  data: z.infer<typeof schema>;
  workspace: WorkspaceProps;
  user: Pick<User, "id" | "name">;
}) => {
  const [url, key, domain] = data.text;
  const body = createLinkBodySchema.parse({ url, key, domain });

  const { link, error } = await processLink({
    payload: body,
    workspace: workspace as WorkspaceProps,
    userId: user.id,
  });

  if (error != null) {
    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "plain_text",
            text: error,
          },
        },
      ],
    };
  }

  const { shortLink, createdAt } = await createLink(link);

  const createdAtDate = new Date(createdAt).toLocaleDateString("en-us", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "Short link created!",
        },
        fields: [
          {
            type: "mrkdwn",
            text: "*Short Link*",
          },
          {
            type: "mrkdwn",
            text: "*Destination*",
          },
          {
            type: "mrkdwn",
            text: `<${shortLink}|${shortLink}>`,
          },
          {
            type: "mrkdwn",
            text: `<${url}|${url}>`,
          },
        ],
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Created by* ${user.name} | ${createdAtDate} | <${APP_DOMAIN}/${workspace.slug}?search=${shortLink} | View on Dub>`,
          },
        ],
      },
    ],
  };
};
