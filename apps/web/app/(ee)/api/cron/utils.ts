import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

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

interface ErrorHandlerOptions {
  error: unknown;
}

export function handleCronErrorResponse({ error }: ErrorHandlerOptions) {
  const { error: apiError, status } = handleApiError(error);

  return NextResponse.json(
    {
      error: apiError,
    },
    {
      status,
    },
  );
}
