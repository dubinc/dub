import { prisma } from "@/lib/prisma";
import { sendBatchEmail } from "@dub/email";
import ClicksExceeded from "@dub/email/templates/clicks-exceeded";
import LinksLimitAlert from "@dub/email/templates/links-limit";
import {
  APP_DOMAIN,
  capitalize,
  nFormatter,
  SLACK_INTEGRATION_ID,
} from "@dub/utils";
import { WorkspaceProps } from "../types";

type LimitEmailType =
  | "firstUsageLimitEmail"
  | "secondUsageLimitEmail"
  | "firstLinksLimitEmail"
  | "secondLinksLimitEmail";

// Return a map of workspace IDs to Slack webhook URLs
export const getSlackWebhooks = async (workspaceIds: string[]) => {
  const slackWebhookByWorkspace = new Map<string, string>();

  if (workspaceIds.length === 0) {
    return slackWebhookByWorkspace;
  }

  const slackInstallations = await prisma.installedIntegration.findMany({
    where: {
      projectId: {
        in: workspaceIds,
      },
      integrationId: SLACK_INTEGRATION_ID,
    },
    select: {
      projectId: true,
      webhooks: {
        where: {
          disabledAt: null,
        },
        select: {
          url: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
  });

  for (const installation of slackInstallations) {
    const url = installation.webhooks[0]?.url;

    if (url) {
      slackWebhookByWorkspace.set(installation.projectId, url);
    }
  }

  return slackWebhookByWorkspace;
};

const getUpgradePlanButton = (billingUrl: string) => ({
  type: "actions",
  elements: [
    {
      type: "button",
      text: {
        type: "plain_text",
        text: "Upgrade your plan",
      },
      url: billingUrl,
      style: "primary",
    },
  ],
});

const formatLimitSlackMessage = ({
  workspace,
  type,
}: {
  workspace: WorkspaceProps;
  type: LimitEmailType;
}) => {
  const billingUrl = `${APP_DOMAIN}/${workspace.slug}/settings/billing`;
  const workspaceUrl = `${APP_DOMAIN}/${workspace.slug}`;

  if (type.endsWith("UsageLimitEmail")) {
    return {
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Clicks Limit Exceeded*`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Your Dub workspace, <${workspaceUrl}|*${workspace.name}*>, has exceeded the *${capitalize(workspace.plan)} Plan* limit of *${nFormatter(workspace.usageLimit)} link clicks/month*. You have used *${nFormatter(workspace.usage, { digits: 2 })} link clicks* across all your links in your current billing cycle.`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Usage*\n${nFormatter(workspace.usage, { digits: 2 })}`,
            },
            {
              type: "mrkdwn",
              text: `*Limit*\n${nFormatter(workspace.usageLimit)}`,
            },
          ],
        },
        getUpgradePlanButton(billingUrl),
      ],
    };
  }

  const percentage = Math.round(
    (workspace.linksUsage / workspace.linksLimit) * 100,
  );

  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Links Limit Alert*`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Your Dub workspace, <${workspaceUrl}|*${workspace.name}*>, has used *${percentage}%* of the monthly links limit included in the ${capitalize(workspace.plan)} plan. You have created a total of *${nFormatter(workspace.linksUsage, { full: true })} links* (out of a maximum of ${nFormatter(workspace.linksLimit, { full: true })} links) in your current billing cycle.`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Usage*\n${nFormatter(workspace.linksUsage, { full: true })} (${percentage}%)`,
          },
          {
            type: "mrkdwn",
            text: `*Limit*\n${nFormatter(workspace.linksLimit, { full: true })}`,
          },
        ],
      },
      getUpgradePlanButton(billingUrl),
    ],
  };
};

const notifyViaSlack = async ({
  workspace,
  type,
  slackWebhookUrl,
}: {
  workspace: WorkspaceProps;
  type: LimitEmailType;
  slackWebhookUrl: string;
}) => {
  try {
    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formatLimitSlackMessage({ workspace, type })),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(
        `Failed to send usage limit Slack alert for workspace ${workspace.id}: ${response.status} ${response.statusText}`,
      );
    } else {
      console.log(
        `Successfully sent usage limit Slack alert for workspace ${workspace.id}`,
      );
    }
  } catch (error) {
    console.error(
      `Failed to send usage limit Slack alert for workspace ${workspace.id}:`,
      error,
    );
  }
};

export const sendWorkspaceLimitAlert = async ({
  emails,
  workspace,
  type,
  slackWebhookUrl,
}: {
  emails: string[];
  workspace: WorkspaceProps;
  type: LimitEmailType;
  slackWebhookUrl?: string | null;
}) => {
  const percentage = Math.round(
    (workspace.linksUsage / workspace.linksLimit) * 100,
  );

  return await Promise.allSettled([
    sendBatchEmail(
      emails.map((email) => ({
        subject: type.endsWith("UsageLimitEmail")
          ? "Dub Alert: Clicks Limit Exceeded"
          : `Dub Alert: ${workspace.name} has used ${percentage.toString()}% of its links limit for the month.`,
        to: email,
        react: type.endsWith("UsageLimitEmail")
          ? ClicksExceeded({
              email,
              workspace,
              type: type as "firstUsageLimitEmail" | "secondUsageLimitEmail",
            })
          : LinksLimitAlert({
              email,
              workspace,
            }),
        variant: "notifications",
      })),
    ),

    prisma.sentEmail.create({
      data: {
        projectId: workspace.id,
        type,
      },
    }),

    ...(slackWebhookUrl
      ? [
          notifyViaSlack({
            workspace,
            type,
            slackWebhookUrl,
          }),
        ]
      : []),
  ]);
};
