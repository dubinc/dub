const POSTBACK_URL_RECEIVERS: Record<string, "slack" | "custom"> = {
  "hooks.slack.com": "slack",
};

export const identifyPostbackDestination = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return POSTBACK_URL_RECEIVERS[hostname] ?? "custom";
  } catch {
    return "custom";
  }
};
