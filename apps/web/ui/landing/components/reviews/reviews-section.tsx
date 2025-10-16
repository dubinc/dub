"use client";

import { SectionTitle } from "@/ui/landing/components/section-title.tsx";
import { Marquee } from "@/components/ui/marquee";
import { TestimonialCard } from "./testimonial-card";
import { useReviews } from "@/hooks/use-reviews";
import { Star } from "lucide-react";

export const ReviewsSection = () => {
  const { testimonials, stats } = useReviews();

  const firstRow = testimonials.slice(0, Math.ceil(testimonials.length / 2));
  const secondRow = testimonials.slice(Math.ceil(testimonials.length / 2));

  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <div className='mb-12 flex flex-col items-center justify-center gap-6 sm:mb-16 lg:mb-24 lg:gap-10'>
        <SectionTitle
          titleFirstPart={"Why Our Customers"}
          highlightedTitlePart={"Choose GetQR"}
        />

        {stats.totalReviews > 0 && (
          <div className='flex flex-wrap items-center justify-center gap-2 sm:gap-3'>
            <span className='text-sm sm:text-base  font-semibold text-neutral'>Excellent</span>
            <div className='flex gap-1'>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className='h-5 w-5 fill-[#F5A623] text-[#F5A623] sm:h-6 sm:w-6'
                />
              ))}
            </div>
            <p className='text-sm sm:text-base text-neutral'>
              <span className='font-semibold'>{stats.averageRating.toFixed(2)}</span> based on{' '}
              <span className='font-semibold'>{stats.totalReviews}</span> reviews
            </p>
          </div>
        )}
      </div>

      {testimonials.length > 0 && (
        <div className='relative mx-auto max-w-7xl'>
          <div className='pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[rgb(248,252,252)] to-transparent sm:w-32' />
          <div className='pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[rgb(248,252,252)] to-transparent sm:w-32' />
          <div className='space-y-6'>
            <div className='w-full overflow-hidden'>
              <Marquee pauseOnHover duration={40} gap={1.5}>
                {firstRow.map((testimonial, index) => (
                  <TestimonialCard key={index} testimonial={testimonial} />
                ))}
              </Marquee>
            </div>
            <div className='w-full overflow-hidden'>
              <Marquee pauseOnHover duration={40} gap={1.5} reverse>
                {secondRow.map((testimonial, index) => (
                  <TestimonialCard key={index} testimonial={testimonial} />
                ))}
              </Marquee>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
