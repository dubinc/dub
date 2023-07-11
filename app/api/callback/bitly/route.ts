import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code") as string;

  const response = await fetch("https://api-ssl.bitly.com/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `client_id=${process.env.NEXT_PUBLIC_BITLY_CLIENT_ID}&client_secret=${process.env.BITLY_CLIENT_SECRET}&code=${code}&redirect_uri=${process.env.NEXT_PUBLIC_BITLY_REDIRECT_URI}`,
  }).then((r) => r.text());

  const params = new URLSearchParams(response);
  console.log({
    access_token: params.get("access_token"),
  });

  return NextResponse.redirect("http://app.localhost:3000/vercel");
}
