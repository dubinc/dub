export const log = async (message: string) => {
  /* Log a message to the console */
  if (!process.env.DUB_SLACK_HOOK) return;
  try {
    return await fetch(process.env.DUB_SLACK_HOOK, {
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
              text: message,
            },
          },
        ],
      }),
    });
  } catch (e) {
    console.log(`Failed to log to Vercel Slack. Error: ${e}`);
  }
};
