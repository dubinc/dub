import { MaxWidthWrapper } from "@dub/ui";

export default function PartnerSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MaxWidthWrapper className="grid gap-5 py-8">{children}</MaxWidthWrapper>
  );
}
