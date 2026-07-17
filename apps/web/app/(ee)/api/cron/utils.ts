export function logAndRespond(
  body: string | Record<string, unknown>,
  {
    status = 200,
    logLevel = "info",
  }: {
    status?: number;
    logLevel?: "error" | "warn" | "info";
  } = {},
) {
  if (typeof body === "string") {
    console[logLevel](body);
    return new Response(body, { status });
  }

  console[logLevel](body);
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function logAndReturn<T>(value: T): T {
  console.log(value);
  return value;
}
