import { PageContent } from "@/ui/layout/page-content";

export default function TrackingGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageContent className="bg-white px-4">{children}</PageContent>;
}
