import { NextResponse } from "next/server";

export const GET = async (req: Request) => {
  const workspaceId = new URL(req.url).searchParams.get("workspaceId");
  const q = new URL(req.url).searchParams.get("q") ?? "";

  return new NextResponse(`<p>${q}</p>`, {
    headers: {
      "content-type": "text/html",
      "x-workspace-id": workspaceId ?? "",
    },
  });
};
