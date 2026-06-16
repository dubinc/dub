import { getNetworkProgram } from "@/lib/fetchers/get-network-program";
import { MarketplaceExternalProgramPage } from "@/ui/program-marketplace/external/marketplace-external-program-page";
import { generateMarketplaceProgramStaticParams } from "@/ui/program-marketplace/pages/marketplace-program-page";
import {
  getMarketplaceCanonicalUrl,
  getMarketplaceProgramHref,
} from "@/ui/program-marketplace/utils/urls";
import { constructMetadata } from "@dub/utils";
import { Metadata } from "next";

export const revalidate = 3600;

export async function generateStaticParams() {
  const programParams = await generateMarketplaceProgramStaticParams();

  return programParams.map(({ slug }) => ({ programSlug: slug[0] }));
}

export async function generateMetadata(props: {
  params: Promise<{ programSlug: string }>;
}): Promise<Metadata> {
  const { programSlug } = await props.params;

  const program = await getNetworkProgram({ slug: programSlug });

  return constructMetadata({
    title: program ? program.name : "Program Details",
    description:
      program?.description ||
      (program
        ? `Join the ${program.name} affiliate program on Dub's Partner Network.`
        : `Browse and apply to the best SaaS affiliate programs on Dub's Partner Network.`),
    image: program
      ? program.marketplaceHeaderImage || program.logo || undefined
      : undefined,
    canonicalUrl: getMarketplaceCanonicalUrl(
      getMarketplaceProgramHref(programSlug),
    ),
  });
}

export default async function MarketplaceProgramDetailPage(props: {
  params: Promise<{ programSlug: string }>;
}) {
  const { programSlug } = await props.params;

  return <MarketplaceExternalProgramPage programSlug={programSlug} />;
}
