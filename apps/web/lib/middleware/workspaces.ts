import { UserProps } from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "./utils";
import { getDefaultWorkspace } from "./utils/get-default-workspace";
import { isTopLevelSettingsRedirect } from "./utils/is-top-level-settings-redirect";

const topLevelSettingRedirects = ["/integrations", "/webhooks", "/domains"];

export default async function WorkspacesMiddleware(
  req: NextRequest,
  user: UserProps,
) {
  const { path, searchParamsString } = parse(req);

  const defaultWorkspace = await getDefaultWorkspace(user);

  if (defaultWorkspace) {
    let redirectPath = path;
    if (["/", "/login", "/register"].includes(path)) {
      redirectPath = "";
    } else if (isTopLevelSettingsRedirect(path)) {
      redirectPath = `/settings/${path}`;
    }
    return NextResponse.redirect(
      new URL(
        `/${defaultWorkspace}${redirectPath}${searchParamsString}`,
        req.url,
      ),
    );
  } else {
    return NextResponse.redirect(new URL("/workspaces", req.url));
  }
}
