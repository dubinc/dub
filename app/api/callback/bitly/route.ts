import { NextResponse } from "next/server";
import prisma from "#/lib/prisma";
import { redis } from "#/lib/upstash";

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

  const hostname =
    process.env.NEXT_PUBLIC_VERCEL_ENV === "production"
      ? "https://app.dub.sh"
      : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? "https://preview.dub.sh"
      : "http://app.localhost:3000";

  if (!response || response.includes("error")) {
    return NextResponse.redirect(hostname);
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
    `${hostname}${project ? `/${project.slug}?import=bitly` : ""}`,
  );
}
