export function logAndRespond({
  message,
  status = 200,
  logLevel = "info",
}: {
  message: string;
  status?: number;
  logLevel?: "error" | "warn" | "info";
}) {
  console[logLevel](message);
  return new Response(message, { status });
}
