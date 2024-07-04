"use client";

import { Icon } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { ReactNode } from "react";

export default function NavLink({
  segment,
  icon: Icon,
  children,
}: {
  segment: string | null;
  icon: Icon;
  children: ReactNode;
}) {
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const { slug } = useParams() as {
    slug?: string;
  };

  const href = `${slug ? `/${slug}` : ""}/settings${
    segment ? `/${segment}` : ""
  }`;

  const isSelected = selectedLayoutSegment === segment;

  return (
    <Link
      key={href}
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg p-2 text-sm text-gray-950 outline-none transition-all duration-75",
        "ring-black/50 focus-visible:ring-2",
        isSelected
          ? "bg-gray-950/5"
          : "hover:bg-gray-950/5 active:bg-gray-950/10",
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-4 w-4",
            isSelected ? "text-gray-950" : "text-gray-700",
          )}
        />
      )}
      {children}
    </Link>
  );
}
