import { APP_DOMAIN } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import type { SessionUser } from "../better-auth/get-session";
import { getDefaultWorkspace } from "./utils/get-default-workspace";
import { parse } from "./utils/parse";

export async function NewLinkMiddleware(
  req: NextRequest,
  user: Pick<SessionUser, "id" | "defaultWorkspace">,
) {
  const { fullPath } = parse(req);

  const defaultWorkspace = await getDefaultWorkspace(user);

  const searchParams = new URL(fullPath, APP_DOMAIN).searchParams;

  if (defaultWorkspace) {
    return NextResponse.redirect(
      new URL(
        `/${defaultWorkspace}/links?newLink=${searchParams.get("link") || true}${searchParams.has("domain") ? `&newLinkDomain=${searchParams.get("domain")}` : ""}`,
        req.url,
      ),
    );
  } else {
    return NextResponse.redirect(
      new URL(`/workspaces?newWorkspace=true`, req.url),
    );
  }
}
