"use client";

import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function NavLink({
  segment,
  children,
}: {
  segment: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { slug } = useParams() as {
    slug?: string;
  };

  const href = `${slug ? `/${slug}` : ""}/settings${segment}`;

  return (
    <Link
      key={href}
      href={href}
      className={cn(
        "rounded-md p-2.5 text-sm transition-all duration-75 hover:bg-gray-100 active:bg-gray-200",
        {
          "font-semibold text-black": pathname === href,
        },
      )}
    >
      {children}
    </Link>
  );
}
