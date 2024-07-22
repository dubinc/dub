import IntegrationManagePageClient from "./page-client";

export default function IntegrationManagePage({
  params,
}: {
  params: { integrationId: string };
}) {
  const { integrationId } = params;

  return <IntegrationManagePageClient integrationId={integrationId} />;
}
