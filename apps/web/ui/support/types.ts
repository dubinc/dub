export type SupportChatVariant = "embedded" | "bubble";
export type SupportChatContext = "app" | "partners";

const CONTEXT_MAP: Record<string, SupportChatContext> = {
  app: "app",
  partners: "partners",
};

export function parseSupportChatVariant(
  value: string | undefined,
): SupportChatVariant {
  return value === "embedded" ? "embedded" : "bubble";
}

export function parseSupportChatContext(
  value: string | undefined,
): SupportChatContext {
  return (value && CONTEXT_MAP[value]) || "app";
}
