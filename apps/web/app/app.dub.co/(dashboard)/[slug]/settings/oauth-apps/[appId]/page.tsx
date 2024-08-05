import OAuthAppManagePageClient from "./page-client";

export default function OAuthAppManagePage({
  params,
}: {
  params: { appId: string };
}) {
  const { appId } = params;

  return <OAuthAppManagePageClient appId={appId} />;
}
