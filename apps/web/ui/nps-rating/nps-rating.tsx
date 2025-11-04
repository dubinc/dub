"use client";

import { Button } from "@dub/ui";
import { FC, useEffect } from "react";

interface INpsRatingProps {
  handleRatingClick: (rating: number) => void;
  fireOpenEvent: (element_no: number) => void;
}

export const NpsRating: FC<INpsRatingProps> = ({
  handleRatingClick,
  fireOpenEvent,
}) => {
  useEffect(() => {
    fireOpenEvent(1);
  }, []);

  return (
    <div className="fixed bottom-3 md:bottom-8 right-0 z-50 w-full max-w-max">
      <div className="w-full px-3 md:px-8">
        <div className="border-border-500 relative w-full rounded-xl border bg-white p-4 shadow-2xl md:p-6">
          <h2 className="mb-4 text-balance pr-6 text-sm font-semibold leading-snug md:mb-6 md:text-base">
            How likely are you to recommend GetQR to your friends and
            colleagues?
          </h2>
          <div className="w-full space-y-4 md:space-y-6">
            <div className="flex max-w-full gap-2 justify-between overflow-auto dub-scrollbar">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => {
                return (
                  <Button
                    key={rating}
                    onClick={() => handleRatingClick(rating)}
                    className="bg-secondary-100 border border-neutral-200/10 text-secondary h-9 min-w-9 w-9 rounded-full text-sm md:h-10 md:min-w-10 hover:ring-0 hover:outline-none px-0 hover:bg-neutral-100"
                    text={rating}
                  />
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
