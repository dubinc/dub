import { ExpandingArrow } from "@dub/ui";
import { cn, createHref, UTMTags } from "@dub/utils";
import Link from "next/link";

const logos = [
  "cal",
  "framer",
  "twilio",
  "hubermanlab",
  "vercel",
  "perplexity",
  "raycast",
  "clerk",
  "whop",
  "viator",
  "sketch",
  "supabase",
  "hashnode",
];

export default function Logos({
  domain,
  utmParams,
  variant = "default",
  copy = "Giving marketing superpowers to world-class companies",
  className,
}: {
  domain: string;
  utmParams?: Partial<Record<(typeof UTMTags)[number], string>>;
  variant?: "default" | "inline";
  copy?: string | null;
  className?: string;
}) {
  return (
    <Link
      href={createHref("/customers", domain, {
        utm_campaign: domain,
        utm_content: "See more of our fantastic customers",
        ...utmParams,
      })}
      className={cn(
        "group relative mx-auto mb-2 mt-10 block w-full max-w-screen-lg overflow-hidden [&_*]:delay-75",
        variant === "inline" && "sm:flex sm:items-center",
        className,
      )}
    >
      {copy !== null && (
        <p
          className={cn(
            "mx-auto max-w-sm text-balance text-center text-sm text-slate-500",
            variant === "default"
              ? "transition-[filter,opacity] duration-300 group-hover:opacity-30 group-hover:blur-sm sm:max-w-xl"
              : "sm:text-left",
          )}
        >
          {copy}
        </p>
      )}
      <div className="relative flex w-full items-center overflow-hidden px-5 pb-8 pt-8 [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)] md:px-0">
        {[...Array(2)].map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "flex w-max min-w-max items-center gap-5 pl-5",
              "motion-safe:animate-infinite-scroll [--scroll:-100%] motion-safe:[animation-duration:40s]",
              "transition-[filter,opacity] duration-300 group-hover:opacity-30 group-hover:blur-sm",
            )}
            aria-hidden={idx !== 0}
          >
            {logos.map((logo) => (
              <img
                key={logo}
                src={`https://assets.dub.co/clients/${logo}.svg`}
                alt={logo.toUpperCase()}
                width={520}
                height={182}
                draggable={false}
                className={cn(
                  "h-12 w-auto",
                  logo === "cal" && "-mx-5 h-14",
                  logo === "viator" && "h-11",
                  logo === "perplexity" && "h-14",
                  logo === "hubermanlab" && "h-14",
                )}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <span className="flex items-center text-sm font-medium text-slate-900">
          See more of our fantastic customers{" "}
          <ExpandingArrow className="size-4" />
        </span>
      </div>
    </Link>
  );
}
