import { getNetworkProgram } from "@/lib/fetchers/get-network-program";
import { ApplicationAnalytics } from "@/ui/application-analytics";
import { MarketplaceProgramDetailBody } from "@/ui/program-marketplace/marketplace-program-detail-body";
import { MarketplaceProgramDetailsLayout } from "@/ui/program-marketplace/marketplace-program-details-layout";
import { MarketplaceProgramHero } from "@/ui/program-marketplace/marketplace-program-hero";
import {
  getMarketplaceAllHref,
  getMarketplaceHref,
  getMarketplacePublicApplyHref,
} from "@/ui/program-marketplace/utils/urls";
import { Button, ChevronLeft } from "@dub/ui";
import Link from "next/link";
import { redirect } from "next/navigation";
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
    redirect(getMarketplaceHref());
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
                <Link
                  href={getMarketplacePublicApplyHref(program.slug)}
                  className="inline-block w-fit"
                >
                  <Button
                    text="Apply"
                    className="h-10 w-fit rounded-lg px-6 text-sm font-medium"
                  />
                </Link>
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
