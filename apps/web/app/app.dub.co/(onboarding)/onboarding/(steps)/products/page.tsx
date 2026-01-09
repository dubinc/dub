import { StepPage } from "../step-page";
import { ProductSelector } from "./product-selector";

export default function Products() {
  return (
    <StepPage
      title="What do you want to do with Dub?"
      description="Choose how you'll use Dub to grow your business"
      className="max-w-none"
    >
      <ProductSelector />
    </StepPage>
  );
}
