import Events from "@/ui/analytics/events";
import { PageContent } from "@/ui/layout/page-content";
import { redirect } from "next/navigation";

export default async function ProgramEvents({
  params,
}: {
  params: Promise<{ programSlug: string }>;
}) {
  const { programSlug } = await params;
  if (programSlug === "perplexity") {
    redirect(`/programs/${programSlug}`);
  }
  return (
    <PageContent title="Events">
      <Events />
    </PageContent>
  );
}
