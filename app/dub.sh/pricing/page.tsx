import FAQ from "#/ui/home/faq";
import Logos from "#/ui/home/logos";
import Pricing from "#/ui/home/pricing";
import { constructMetadata } from "#/lib/utils";

export const metadata = constructMetadata({
  title: "Pricing – Dub",
});

export default function PricingPage() {
  return (
    <>
      <Pricing />
      <Logos copy="Trusted & loved by marketing teams at world-class companies" />
      <FAQ />
    </>
  );
}
