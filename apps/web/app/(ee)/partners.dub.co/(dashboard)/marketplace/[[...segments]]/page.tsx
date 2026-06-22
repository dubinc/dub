import { MarketplaceRouter } from "@/ui/program-marketplace/marketplace-router";
import {
  generateMarketplaceProgramStaticParams,
  revalidate,
} from "@/ui/program-marketplace/pages/marketplace-program-page";

export { revalidate };

export async function generateStaticParams() {
  return generateMarketplaceProgramStaticParams();
}

export default async function MarketplacePage(props: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments } = await props.params;

  return <MarketplaceRouter segments={segments} />;
}
