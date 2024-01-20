const logTypeToEnv = {
  cron: process.env.DUB_SLACK_HOOK_CRON,
  links: process.env.DUB_SLACK_HOOK_LINKS,
};

export const log = async ({
  message,
  type,
  mention = false,
}: {
  message: string;
  type: "cron" | "links";
  mention?: boolean;
}) => {
  if (
    process.env.NODE_ENV === "development" ||
    !process.env.DUB_SLACK_HOOK_CRON ||
    !process.env.DUB_SLACK_HOOK_LINKS
  )
    console.log(message);
  /* Log a message to the console */
  const HOOK = logTypeToEnv[type];
  if (!HOOK) return;
  try {
    return await fetch(HOOK, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${mention ? "<@U0404G6J3NJ> " : ""}${message}`,
            },
          },
        ],
      }),
    });
  } catch (e) {
    console.log(`Failed to log to Dub Slack. Error: ${e}`);
  }
};
