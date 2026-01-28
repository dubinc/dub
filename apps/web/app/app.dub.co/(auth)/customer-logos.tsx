"use client";

import { cn } from "@dub/utils";

const CUSTOMER_LOGOS: { name: string; src: string; className?: string }[] = [
  {
    name: "Framer",
    src: "https://assets.dub.co/companies/framer.svg",
    className: "h-6",
  },
  {
    name: "Granola",
    src: "https://assets.dub.co/companies/granola.svg",
    className: "h-6",
  },
  { name: "Buffer", src: "https://assets.dub.co/companies/buffer.svg" },
  {
    name: "Copper",
    src: "https://assets.dub.co/companies/copper.svg",
    className: "h-4",
  },
  {
    name: "Perplexity",
    src: "https://assets.dub.co/companies/perplexity.svg",
    className: "h-5",
  },
  { name: "Wispr Flow", src: "https://assets.dub.co/companies/flow.svg" },
];

export function CustomerLogos() {
  return (
    <div className="relative z-10 mx-auto flex max-w-md flex-wrap items-center justify-center gap-x-14 gap-y-8 px-8 pb-12 pt-6 lg:px-10">
      {CUSTOMER_LOGOS.map((logo, index) => (
        <img
          key={logo.name}
          src={logo.src}
          alt={logo.name}
          className={cn(
            "animate-fade-in-blur h-5 w-auto opacity-0 [animation-fill-mode:forwards]",
            logo.className,
          )}
          style={{ animationDelay: `${500 + index * 120}ms` }}
        />
      ))}
    </div>
  );
}
