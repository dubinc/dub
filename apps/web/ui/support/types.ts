export type SupportChatVariant = "embedded" | "bubble";
export type SupportChatContext = "app" | "partners" | "docs";

const CONTEXT_MAP: Record<string, Exclude<SupportChatContext, undefined>> = {
  app: "app",
  partners: "partners",
  docs: "docs",
};

export function parseSupportChatVariant(
  value: string | undefined,
): SupportChatVariant {
  return value === "embedded" ? "embedded" : "bubble";
}

export function parseSupportChatContext(
  value: string | undefined,
): SupportChatContext {
  return value ? CONTEXT_MAP[value] : CONTEXT_MAP.docs;
}
