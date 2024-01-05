"use client";

import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";
import { ReactNode } from "react";

export default function NavLink({
  segment,
  children,
}: {
  segment: string | null;
  children: ReactNode;
}) {
  const selectedLayoutSegment = useSelectedLayoutSegment();
  const { slug } = useParams() as {
    slug?: string;
  };

  const href = `${slug ? `/${slug}` : ""}/settings${
    segment ? `/${segment}` : ""
  }`;

  return (
    <Link
      key={href}
      href={href}
      className={cn(
        "rounded-md p-2.5 text-sm transition-all duration-75 hover:bg-gray-100 active:bg-gray-200",
        {
          "font-semibold text-black": selectedLayoutSegment === segment,
        },
      )}
    >
      {children}
    </Link>
  );
}
