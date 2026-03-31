import { cn } from "@dub/utils";
import Link from "next/link";
import { CustomerLogos } from "./customer-logos";

export function SidePanel() {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden border-l border-black/5 bg-neutral-50 min-[900px]:flex">
      {/* Gradient at bottom */}
      {[...Array(2)].map((_, idx) => (
        <div
          key={idx}
          className={cn(
            "absolute bottom-0 left-1/2 size-[80px] -translate-x-1/2 translate-y-1/2 scale-x-[1.6]",
            idx === 0 ? "mix-blend-overlay" : "opacity-15",
          )}
        >
          {[...Array(idx === 0 ? 2 : 1)].map((_, innerIdx) => (
            <div
              key={innerIdx}
              className={cn(
                "absolute -inset-16 mix-blend-overlay blur-[50px] saturate-[2]",
                "bg-[conic-gradient(from_90deg,#F00_5deg,#EAB308_63deg,#5CFF80_115deg,#1E00FF_170deg,#855AFC_220deg,#3A8BFD_286deg,#F00_360deg)]",
              )}
            />
          ))}
        </div>
      ))}

      {/* Testimonial section - vertically centered */}
      <div className="relative flex grow items-center justify-center p-8 lg:p-14">
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-xl border border-neutral-900/10">
            <img
              src="https://assets.dub.co/cms/framer-thumbnail.png"
              alt="Framer team"
              className="aspect-[16/12] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-neutral-900 to-transparent opacity-30" />
            <img
              src="https://assets.dub.co/companies/framer.svg"
              alt="Framer"
              className="absolute left-6 top-6 h-8 w-auto brightness-0 invert"
            />
          </div>

          <p className="text-content-default max-w-[370px] text-pretty text-xl font-medium">
            Learn how Framer manages $500K+ in monthly affiliate payouts with
            Dub
          </p>

          <Link
            href="https://dub.co/customers/framer"
            target="_blank"
            className="text-content-emphasis flex h-8 w-fit items-center rounded-lg bg-black/5 px-3 text-sm font-medium transition-[transform,background-color] duration-75 hover:bg-black/10 active:scale-[0.98]"
          >
            Read more
          </Link>
        </div>
      </div>

      <CustomerLogos />
    </div>
  );
}
