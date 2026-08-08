import { MarketplaceRouter } from "@/ui/program-marketplace/marketplace-router";

export {
  generateStaticParams,
  revalidate,
} from "@/ui/program-marketplace/utils/default-exports";

export default async function MarketplacePage(props: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments } = await props.params;

  return <MarketplaceRouter segments={segments} />;
}
