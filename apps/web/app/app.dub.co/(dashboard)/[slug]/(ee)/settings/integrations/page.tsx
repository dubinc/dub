import { IntegrationsList } from "./integrations-list";

export const revalidate = 300; // 5 minutes

export default function IntegrationsPage() {
  return <IntegrationsList />;
}
