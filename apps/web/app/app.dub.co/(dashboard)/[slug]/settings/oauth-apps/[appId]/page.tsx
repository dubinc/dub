import OAuthAppManagePageClient from "./page-client";

export default async function OAuthAppManagePage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;

  return <OAuthAppManagePageClient appId={appId} />;
}
