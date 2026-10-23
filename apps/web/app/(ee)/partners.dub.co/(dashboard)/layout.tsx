import { PartnerProfileAuth } from "./auth";
import { PartnerMainNav } from "./partner-main-nav";

export default function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PartnerMainNav>
      <PartnerProfileAuth>{children}</PartnerProfileAuth>
    </PartnerMainNav>
  );
}
