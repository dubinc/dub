import { StepPage } from "../step-page";
import { DefaultDomainSelector } from "./default-domain-selector";

export default async function Domain({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const isPartners = product !== "links";

  return (
    <StepPage
      title="Add a custom domain"
      description={
        isPartners ? (
          <>
            A{" "}
            <a
              href="https://dub.co/help/article/choosing-a-custom-domain"
              target="_blank"
              className="cursor-help font-medium underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-700"
            >
              dedicated domain
            </a>{" "}
            is required for Dub Partner programs, and can be changed at anytime.
          </>
        ) : (
          <>
            Make your links stand out and{" "}
            <a
              href="https://dub.co/blog/custom-domains"
              target="_blank"
              className="cursor-help font-medium underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-700"
            >
              boost click-through rates by 30%
            </a>
          </>
        )
      }
      className="max-w-none [&>div:first-of-type]:max-w-[640px]"
    >
      <DefaultDomainSelector />
    </StepPage>
  );
}
