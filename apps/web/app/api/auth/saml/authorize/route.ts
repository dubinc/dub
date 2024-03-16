import jackson from "@/lib/jackson";
import { getSearchParams } from "@dub/utils";
import { NextResponse } from "next/server";

const handler = async (req: Request) => {
  const { oauthController } = await jackson();

  const requestParams =
    req.method === "GET" ? getSearchParams(req.url) : await req.json();

  const { redirect_url, authorize_form } =
    await oauthController.authorize(requestParams);

  if (redirect_url) {
    return NextResponse.redirect(redirect_url, {
      status: 302,
    });
  } else {
    return new Response(authorize_form, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
};

export { handler as GET, handler as POST };
