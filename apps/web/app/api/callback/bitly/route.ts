import prisma from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // get code and workspace id from query params
  const code = searchParams.get("code") as string;
  const workspaceId = searchParams.get("state") as string;

  // get access token from bitly
  const response = await fetch("https://api-ssl.bitly.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `client_id=${process.env.NEXT_PUBLIC_BITLY_CLIENT_ID}&client_secret=${process.env.BITLY_CLIENT_SECRET}&code=${code}&redirect_uri=${process.env.NEXT_PUBLIC_BITLY_REDIRECT_URI}`,
  }).then((r) => r.text());

  if (!response || response.includes("error")) {
    return NextResponse.redirect(APP_DOMAIN);
  }

  const params = new URLSearchParams(response);

  const [workspace, _] = await Promise.all([
    // get workspace slug from workspaceId
    prisma.project.findUnique({
      where: {
        id: workspaceId,
      },
      select: {
        slug: true,
      },
    }),
    // store access token in redis
    redis.set(`import:bitly:${workspaceId}`, params.get("access_token")),
  ]);

  // redirect to workspace page with import query param
  return NextResponse.redirect(
    `${APP_DOMAIN}${workspace ? `/${workspace.slug}?import=bitly` : ""}`,
  );
}
