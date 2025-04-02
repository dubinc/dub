import Analytics from "@/ui/analytics";
import { PageContent } from "@/ui/layout/page-content";
import Link from "next/link";

export default function PartnerAnalytics({
  params,
}: {
  params: { programSlug: string };
}) {
  const { programSlug } = params;

  return (
    <PageContent
      title={
        <span>
          <span className="text-neutral-400">
            <Link
              href={`/programs/${programSlug}/links`}
              className="transition-colors duration-75 hover:text-neutral-500"
            >
              Links
            </Link>{" "}
            /
          </span>{" "}
          Analytics
        </span>
      }
      hideReferButton
    >
      <Analytics />
    </PageContent>
  );
}
