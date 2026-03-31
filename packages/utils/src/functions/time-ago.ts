import ms from "ms";

export const timeAgo = (
  timestamp: Date | null,
  {
    withAgo,
  }: {
    withAgo?: boolean;
  } = {},
): string => {
  if (!timestamp) return "Never";
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 0 || diff > 82800000) {
    // future timestamps or more than 23 hours
    // similar to how Twitter displays timestamps
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year:
        // show year if it's a future timestamp or if it's a different year than current
        diff < 0 ||
        new Date(timestamp).getFullYear() !== new Date().getFullYear()
          ? "numeric"
          : undefined,
    });
  } else if (diff < 1000) {
    // less than 1 second
    return "Just now";
  }

  return `${ms(diff)}${withAgo ? " ago" : ""}`;
};
