"use client";

import { BlurImage, Button } from "@dub/ui";
import {
  arrow,
  autoUpdate,
  FloatingArrow,
  FloatingPortal,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react";
import { useRef } from "react";

export function AffiliateProgramPopup({
  referenceElement,
  onCTA,
  onDismiss,
}: {
  referenceElement: HTMLElement | null;
  onCTA: () => void;
  onDismiss: () => void;
}) {
  const arrowRef = useRef<SVGSVGElement>(null);

  const { refs, floatingStyles, context } = useFloating({
    placement: "bottom-start",
    strategy: "fixed",
    whileElementsMounted(referenceEl, floatingEl, update) {
      return autoUpdate(referenceEl, floatingEl, update, {
        // Not good for performance but keeps the arrow and floating element in the right spot
        animationFrame: true,
      });
    },
    elements: {
      reference: referenceElement,
    },
    middleware: [
      offset({
        mainAxis: 12,
        crossAxis: -10,
      }),
      shift({
        padding: 32,
      }),
      arrow({
        element: arrowRef,
      }),
    ],
  });

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        style={floatingStyles}
        className="drop-shadow-sm"
      >
        <div className="animate-slide-up-fade relative flex w-[244px] flex-col rounded-lg border border-neutral-200 bg-white p-3 text-left">
          <div className="relative aspect-video w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
            <BlurImage
              src="https://assets.dub.co/misc/affiliate-program-thumbnail.jpg"
              alt="thumbnail"
              fill
              className="object-cover"
            />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-neutral-700">
            New Dub Referrals
          </h2>
          <p className="mt-1.5 text-xs text-neutral-500">
            Share your love for Dub and{" "}
            <strong className="font-medium">
              earn 30% for each referral for up to 12 months
            </strong>
            .
          </p>
          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-7 px-2.5 text-xs"
              text="Maybe later"
              onClick={onDismiss}
            />
            <Button
              type="button"
              variant="primary"
              className="h-7 px-2.5 text-xs"
              text="View referrals"
              onClick={onCTA}
            />
          </div>
          <FloatingArrow
            ref={arrowRef}
            context={context}
            className="stroke-neutral-200"
            fill="white"
            strokeWidth={1}
            height={10}
          />
        </div>
      </div>
    </FloatingPortal>
  );
}
