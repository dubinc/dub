"use client";

import { cn } from "@dub/utils";

const CUSTOMER_LOGOS: { name: string; src: string; className?: string }[] = [
  {
    name: "beehiiv",
    src: "https://assets.dub.co/companies/beehiiv.svg",
    className: "h-5",
  },
  {
    name: "Wispr Flow",
    src: "https://assets.dub.co/companies/wisprflow.svg",
    className: "h-4",
  },
  { name: "Granola", src: "https://assets.dub.co/companies/granola.svg" },
  {
    name: "Superhuman",
    src: "https://assets.dub.co/companies/superhuman.svg",
    className: "h-5",
  },
  {
    name: "Polymarket",
    src: "https://assets.dub.co/companies/polymarket.svg",
  },
  {
    name: "Viktor",
    src: "https://assets.dub.co/companies/viktor.svg",
    className: "h-4",
  },
];

export function CustomerLogos() {
  return (
    <div className="relative z-10 mx-auto grid max-w-md grid-cols-3 place-items-center gap-x-12 gap-y-8 px-12 pb-12 pt-6 lg:px-8">
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
