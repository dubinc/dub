import { NextResponse } from "next/server";

export function createResponseWithCookie(
  response: NextResponse,
  {
    name,
    value,
    path,
  }: {
    name: string;
    value: string;
    path: string;
  },
) {
  response.cookies.set(name, value, {
    path,
    maxAge: 60 * 60, // 1 hour
  });

  return response;
}
