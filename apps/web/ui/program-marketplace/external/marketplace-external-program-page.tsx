import { getNetworkProgram } from "@/lib/fetchers/get-network-program";
import { ApplicationAnalytics } from "@/ui/application-analytics";
import { MarketplaceProgramDetailBody } from "@/ui/program-marketplace/marketplace-program-detail-body";
import { MarketplaceProgramDetailsLayout } from "@/ui/program-marketplace/marketplace-program-details-layout";
import { MarketplaceProgramHero } from "@/ui/program-marketplace/marketplace-program-hero";
import { getMarketplaceAllHref } from "@/ui/program-marketplace/utils/urls";
import { ChevronLeft } from "@dub/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketplaceExternalApplyButton } from "./marketplace-external-apply-button";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

export async function MarketplaceExternalProgramPage({
  programSlug,
}: {
  programSlug: string;
}) {
  const program = await getNetworkProgram({
    slug: programSlug,
  });

  if (!program) {
    redirect("/marketplace");
  }

  return (
    <>
      <ApplicationAnalytics />
      <MarketplaceExternalShell variant="none">
        <MarketplaceProgramDetailsLayout
          header={
            <Link
              href={getMarketplaceAllHref()}
              className="group inline-flex items-center gap-1 text-xs font-medium text-neutral-800 transition-colors hover:text-neutral-500"
            >
              <ChevronLeft className="size-[10px] text-neutral-500 transition-transform group-hover:-translate-x-0.5" />
              All Programs
            </Link>
          }
          hero={
            <MarketplaceProgramHero
              program={program}
              applySlot={
                <MarketplaceExternalApplyButton programSlug={program.slug} />
              }
            />
          }
        >
          <MarketplaceProgramDetailBody program={program} />
        </MarketplaceProgramDetailsLayout>
      </MarketplaceExternalShell>
    </>
  );
}
