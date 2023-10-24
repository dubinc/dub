import jackson from "@/lib/jackson";
import { getSearchParams } from "@/lib/auth";
import { redirect } from "next/navigation";

const handler = async (req: Request) => {
  const { oauthController } = await jackson();

  const requestParams =
    req.method === "GET" ? getSearchParams(req.url) : await req.json();

  const { redirect_url, authorize_form } = await oauthController.authorize(
    requestParams,
  );

  if (redirect_url) {
    redirect(redirect_url);
  } else {
    return new Response(authorize_form, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }
};

export { handler as GET, handler as POST };
