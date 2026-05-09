import { PartnersNavTabs } from "./partners-nav-tabs";

export default function AdminPartnersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-6 p-6">
      <PartnersNavTabs />
      {children}
    </div>
  );
}
