"use client";

import { DiscountProps } from "@/lib/types";
import { Gift, Tooltip } from "@dub/ui";
import { PropsWithChildren } from "react";
import { formatDiscountDescription } from "../format-discount-description";

type DiscountTooltipDiscount = Pick<
  DiscountProps,
  "amount" | "type" | "maxDuration" | "description"
>;

export function DiscountCodeTooltip({
  discount,
  children,
}: PropsWithChildren<{
  discount?: DiscountTooltipDiscount | null;
}>) {
  return (
    <Tooltip content={<DiscountCodeTooltipContent discount={discount} />}>
      {children}
    </Tooltip>
  );
}

function DiscountCodeTooltipContent({
  discount,
}: {
  discount?: DiscountTooltipDiscount | null;
}) {
  const description = discount ? formatDiscountDescription(discount) : null;

  return (
    <div className="w-64">
      {description && (
        <div className="p-1">
          <div className="flex flex-col gap-2 rounded-md border border-neutral-200 bg-neutral-100 p-2">
            <Gift className="size-3.5 shrink-0 text-neutral-800" />
            <p className="text-xs font-semibold leading-4 tracking-tight text-neutral-700">
              {description}
            </p>
          </div>
        </div>
      )}
      <p className="px-3 pb-2 pt-1 text-xs font-medium leading-4 tracking-tight text-neutral-600">
        Sales made with this code are tracked and credited to you.{" "}
        <a
          href="https://dub.co/help/article/dual-sided-incentives"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          Learn more
        </a>
      </p>
    </div>
  );
}
