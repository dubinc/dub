import { getSearchParams, withAuth } from "@/lib/auth-app";
import { getStats } from "@/lib/stats";
import { NextResponse } from "next/server";

export const GET = withAuth(async ({ params, searchParams }) => {
  const { endpoint } = params;
  const { domain, key, interval } = searchParams;

  const response = await getStats({
    domain,
    key,
    endpoint,
    interval,
  });
  return NextResponse.json(response);
});
