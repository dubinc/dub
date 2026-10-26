export type SupportChatVariant = "embedded" | "bubble";
export type SupportChatContext = "app";

export function parseSupportChatVariant(
  value: string | undefined,
): SupportChatVariant {
  return value === "embedded" ? "embedded" : "bubble";
}
