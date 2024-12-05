import { use } from "react";
import OAuthAppManagePageClient from "./page-client";

export default function OAuthAppManagePage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = use(params);

  return <OAuthAppManagePageClient appId={appId} />;
}
