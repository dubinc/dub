import { ReactNode } from "react";
import { IntegrationsLayoutClient } from "./integrations-layout-client";

export default function IntegrationsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <IntegrationsLayoutClient>{children}</IntegrationsLayoutClient>;
}
