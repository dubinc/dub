import { getParams, withAuth } from "@/lib/auth-app";
import { getStats } from "@/lib/stats";
import { NextResponse } from "next/server";

export const GET = withAuth(async (req) => {
  const { domain, key, endpoint, interval } = getParams(req.url);
  const response = await getStats({
    domain,
    key,
    endpoint,
    interval,
  });
  return NextResponse.json(response);
});
