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

export function logAndReturn<T>(value: T): T {
  console.log(value);
  return value;
}
