import { WebClient } from "@slack/web-api";
import { DubApiError } from "../api/errors";

const SLACK_SUPPORT_TIMEOUT_MS = 10_000;

export const getSlackClient = (): WebClient => {
  const token = process.env.DUB_SLACK_ASSISTANT_BOT_TOKEN;
  if (!token) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Priority Slack support is not available right now.",
    });
  }
  return new WebClient(token, { timeout: SLACK_SUPPORT_TIMEOUT_MS });
};
