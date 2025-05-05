import OAuthAppManagePageClient from "./page-client";

export default async function OAuthAppManagePage(
  props: {
    params: Promise<{ appId: string }>;
  }
) {
  const params = await props.params;
  const { appId } = params;

  return <OAuthAppManagePageClient appId={appId} />;
}
