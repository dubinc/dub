import ReviewsIo from "./reviews-io.tsx";

export const ReviewsSection = () => (
  <section className="mx-auto px-3 py-6 md:max-w-[1172px] md:py-[42px]">
    <div className="flex flex-col items-center justify-center gap-2.5 md:gap-3">
      <h2 className="text-neutral max-w-[200px] text-center text-xl font-bold leading-[120%] md:max-w-none md:text-[28px]">
        Why Our Customers{" "}
        <span className="bg-qr-gradient inline-block bg-clip-text text-transparent">
          Choose GetQR
        </span>
      </h2>
      <ReviewsIo />
    </div>
  </section>
);
