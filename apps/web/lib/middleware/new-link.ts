import { APP_DOMAIN } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import { UserProps } from "../types";
import { parse } from "./utils";
import { getDefaultWorkspace } from "./utils/get-default-workspace";

export default async function NewLinkMiddleware(
  req: NextRequest,
  user: UserProps,
) {
  const { fullPath } = parse(req);

  const defaultWorkspace = await getDefaultWorkspace(user);

  const searchParams = new URL(fullPath, APP_DOMAIN).searchParams;

  if (defaultWorkspace) {
    return NextResponse.redirect(
      new URL(
        `/${defaultWorkspace}?newLink=${searchParams.get("link") || true}${searchParams.has("domain") ? `&newLinkDomain=${searchParams.get("domain")}` : ""}`,
        req.url,
      ),
    );
  } else {
    return NextResponse.redirect(
      new URL(`/workspaces?newWorkspace=true`, req.url),
    );
  }
}
