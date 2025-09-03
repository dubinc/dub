import { generateRandomName } from "@/lib/names";
import { ChartActivity2 } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import Link from "next/link";
import React, { ComponentProps } from "react";

export function CustomerRowItem({
  customer,
  href,
  className,
  avatarClassName,
  hideChartActivityOnHover = true,
}: {
  customer: {
    id: string;
    email?: string | null;
    name?: string | null;
    avatar?: string | null;
  };
  href?: string;
  className?: string;
  avatarClassName?: string;
  hideChartActivityOnHover?: boolean;
}) {
  const display = customer.email || customer.name || generateRandomName();

  return (
    <Wrapper
      element={href ? Link : "div"}
      {...(href ? { href, target: "_blank" } : {})}
      className={cn(
        "group flex items-center justify-between gap-2",
        href && "cursor-alias decoration-dotted hover:underline",
        className,
      )}
    >
      <div className="flex items-center gap-2 truncate" title={display}>
        <img
          alt={display}
          src={customer.avatar || `${OG_AVATAR_URL}${customer.id}`}
          className={cn(
            "size-4 shrink-0 rounded-full border border-neutral-200",
            avatarClassName,
          )}
        />
        <span className="truncate">{display}</span>
      </div>
      {href && (
        <ChartActivity2
          className={cn(
            "size-3.5 shrink-0 transition-all",
            hideChartActivityOnHover &&
              "group-hover:-translate-x-3 group-hover:opacity-0",
          )}
        />
      )}
    </Wrapper>
  );
}

const Wrapper = <T extends React.ElementType>({
  element: T,
  ...props
}: {
  element: T;
} & ComponentProps<T>) => <T {...props} />;
