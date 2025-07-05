import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import ReviewsIo from "./reviews-io.tsx";

export const ReviewsSection = () => (
  <section className="mx-auto px-3 py-10 md:max-w-[1172px] lg:py-14">
    <div className="flex flex-col items-center justify-center gap-6 lg:gap-10">
      <SectionTitle
        titleFirstPart={"Why Our Customers"}
        highlightedTitlePart={"Choose GetQR"}
      />
      <ReviewsIo />
    </div>
  </section>
);
