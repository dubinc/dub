import Analytics from "@/ui/analytics";
import { PageContent } from "@/ui/layout/page-content";
import { redirect } from "next/navigation";

export default async function PartnerAnalytics({
  params,
}: {
  params: Promise<{ programSlug: string }>;
}) {
  const { programSlug } = await params;
  if (programSlug === "perplexity") {
    redirect(`/programs/${programSlug}`);
  }
  return (
    <PageContent title="Analytics">
      <Analytics />
    </PageContent>
  );
}
