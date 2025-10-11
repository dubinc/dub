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

  return NextResponse.json(
    {
      message,
    },
    { status },
  );
}
