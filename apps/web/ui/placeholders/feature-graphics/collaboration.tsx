import { cn } from "@dub/utils";

export function Collaboration() {
  return (
    <div
      className="size-full pt-5 [mask-image:linear-gradient(black_50%,transparent)]"
      aria-hidden
    >
      <div className="relative size-full rounded-t-2xl border-x-2 border-t-2 border-orange-600 bg-white/70">
        <div className="absolute -top-px left-1/2 flex h-7 -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_4px_#EA590D80]">
          <BadgeCap />
          <div className="-mx-px flex h-full items-center bg-orange-600 px-2 font-mono text-sm tracking-wide text-white">
            SAML SSO
          </div>
          <BadgeCap className="-scale-x-100" />
        </div>
        <div className="grid grid-cols-6 gap-4 p-8">
          {Array.from({ length: 36 }).map((_, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-lg bg-neutral-300 transition-transform hover:scale-110 sm:rounded-xl"
              style={{
                backgroundImage: "url(https://assets.dub.co/home/people.png)",
                backgroundSize: "3600%", // 36 images
                backgroundPositionX: idx * 100 + "%",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BadgeCap({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="31"
      height="30"
      fill="none"
      viewBox="0 0 28 30"
      className={cn("h-full text-orange-600", className)}
    >
      <path
        fill="currentColor"
        d="M25.658.14h5.337v29.572h-5.337a9.24 9.24 0 0 1-6.626-2.8l-4.327-4.45A26.2 26.2 0 0 0 .5 14.926a26.2 26.2 0 0 0 14.205-7.535l4.327-4.451a9.24 9.24 0 0 1 6.626-2.8"
      />
    </svg>
  );
}
