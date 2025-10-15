"use client";

import { FC } from "react";

interface INpsRatingProps {
  handleRatingClick: (rating: number) => void;
}

export const NpsRating: FC<INpsRatingProps> = ({ handleRatingClick }) => {
  return (
    <div className="fixed bottom-4 right-0 z-50 w-min max-w-full md:bottom-6 md:right-6">
      <div className="w-full px-4">
        <div className="border-border-500 relative w-full rounded-xl border bg-white p-4 shadow-2xl md:p-6">
          <h2 className="mb-4 text-balance pr-6 text-sm font-semibold leading-snug md:mb-6 md:text-base">
            How likely are you to recommend GetQR to your friends and
            colleagues?
          </h2>
          <div className="w-full space-y-4 md:space-y-6">
            <div className="flex w-min max-w-full gap-1.5 overflow-auto md:gap-2">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => {
                return (
                  <button
                    key={rating}
                    onClick={() => handleRatingClick(rating)}
                    className="bg-secondary/50 border-border hover:border-primary/50 hover:bg-secondary flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold text-neutral-700 hover:text-neutral-800 md:h-10 md:w-10"
                  >
                    <span className="relative z-10">{rating}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-1 text-xs md:text-sm">
              <span className="font-medium text-neutral-500">Not likely</span>
              <span className="font-medium text-neutral-500">
                Extremely likely
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
