import { generateRandomName } from "@/lib/names";
import { cn } from "@dub/utils";
import Link from "next/link";
import React, { ComponentProps } from "react";
import { CustomerAvatar } from "./customer-avatar";

export function CustomerRowItem({
  customer,
  href,
  className,
  avatarClassName,
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
}) {
  const display = customer.email || customer.name || generateRandomName();

  return (
    <Wrapper
      element={href ? Link : "div"}
      {...(href
        ? {
            href,
            target: "_blank",
            onClick: (e) => e.stopPropagation(),
            onAuxClick: (e) => e.stopPropagation(),
          }
        : {})}
      className={cn(
        "group flex items-center justify-between gap-2",
        href && "cursor-alias decoration-dotted hover:underline",
        className,
      )}
    >
      <div className="flex items-center gap-2 truncate" title={display}>
        <CustomerAvatar
          customer={customer}
          className={cn("size-5 border border-neutral-200", avatarClassName)}
        />
        <span className="truncate">{display}</span>
      </div>
    </Wrapper>
  );
}

const Wrapper = <T extends React.ElementType>({
  element: T,
  ...props
}: {
  element: T;
} & ComponentProps<T>) => <T {...props} />;
