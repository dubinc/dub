import { cn } from "@dub/utils";

// x, y, rotation, size, z (/shadow)
const LOGOS = [
  // Perplexity
  { x: 0, y: 16, r: 22, s: 1 },
  // Dub
  { x: 23, y: 0, r: -7, s: 0.7 },
  // Tella
  { x: 44, y: 24, r: 13, s: 0.8 },
  // Buffer
  { x: 62, y: 0, r: -49, s: 0.8 },
  // Superhuman
  { x: 82, y: 28, r: -26, s: 0.75 },
  // Framer
  { x: 12, y: 50, r: -11, s: 0.75 },
  // Polymarket
  { x: 26, y: 34, r: -10, s: 0.9, z: 1 },
  // Fillout
  { x: 40, y: 48, r: -11, s: 0.75 },
  // Copper
  { x: 60, y: 54, r: -18, s: 0.9 },
  // Firecrawl
  { x: 78, y: 50, r: -37, s: 0.75, z: 1 },
  // Wispr Flow
  { x: 0, y: 72, r: 15, s: 0.8, z: 1 },
  // Granola
  { x: 26, y: 70, r: 4, s: 0.8 },
];
export const PROGRAM_MARKETPLACE_LOGO_COUNT = LOGOS.length;

export function ProgramMarketplaceLogos({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative z-0 flex size-full flex-wrap gap-2 [--logo-size:32px]",
        className,
      )}
    >
      {LOGOS.map(({ x, y, r, s, z }, index) => {
        return (
          <div
            key={index}
            className={cn(
              "animate-float absolute",
              index % 2 === 0 && "[animation-direction:reverse]",
            )}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              animationDelay: `-${index * 0.1}s`,
            }}
          >
            <div
              className={cn(z && "drop-shadow-sm")}
              style={{
                transform: `rotate(${r}deg)`,
                width: `calc(var(--logo-size, 32px) * ${s})`,
                height: `calc(var(--logo-size, 32px) * ${s})`,
                zIndex: z,
                backgroundImage:
                  "url(https://assets.dub.co/misc/program-marketplace-logos.png)",
                backgroundSize: `${PROGRAM_MARKETPLACE_LOGO_COUNT * 100}%`,
                backgroundPositionX:
                  (PROGRAM_MARKETPLACE_LOGO_COUNT -
                    (index % PROGRAM_MARKETPLACE_LOGO_COUNT)) *
                    100 +
                  "%",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
