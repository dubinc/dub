export function logAndRespond(
  message: string,
  {
    status = 200,
    logLevel = "info",
  }: {
    status?: number;
    logLevel?: "error" | "warn" | "info";
  } = {},
) {
  console[logLevel](message);
  return new Response(message, { status });
}
