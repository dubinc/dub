import { NextResponse } from "next/server";
import prisma from "#/lib/prisma";
import { redis } from "#/lib/upstash";
import { APP_DOMAIN } from "#/lib/constants";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // get code and project id from query params
  const code = searchParams.get("code") as string;
  const projectId = searchParams.get("state") as string;

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

  const [project, _] = await Promise.all([
    // get project slug from projectId
    prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        slug: true,
      },
    }),
    // store access token in redis
    redis.set(`import:bitly:${projectId}`, params.get("access_token")),
  ]);

  // redirect to project page with import query param
  return NextResponse.redirect(
    `${APP_DOMAIN}${project ? `/${project.slug}?import=bitly` : ""}`,
  );
}
