import { cn } from "@dub/utils";
import type { CSSProperties } from "react";

const PROGRAM_MARKETPLACE_LOGOS_URL =
  "https://assets.dub.co/misc/program-marketplace-logos.png";

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

function getProgramMarketplaceLogoStyle(index: number, size?: number) {
  const count = PROGRAM_MARKETPLACE_LOGO_COUNT;
  const normalizedIndex = index % count;

  if (size !== undefined) {
    return {
      backgroundImage: `url(${PROGRAM_MARKETPLACE_LOGOS_URL})`,
      backgroundSize: `${count * size}px ${size}px`,
      backgroundPosition: `-${normalizedIndex * size}px 0px`,
      backgroundRepeat: "no-repeat",
    };
  }

  return {
    backgroundImage: `url(${PROGRAM_MARKETPLACE_LOGOS_URL})`,
    backgroundSize: `${count * 100}% 100%`,
    backgroundPositionX: `${(normalizedIndex / (count - 1)) * 100}%`,
    backgroundRepeat: "no-repeat",
  };
}

function ProgramMarketplaceLogoSprite({
  index,
  className,
  style,
}: {
  index: number;
  className?: string;
  style?: CSSProperties;
}) {
  const size =
    typeof style?.width === "number"
      ? style.width
      : typeof style?.height === "number"
        ? style.height
        : undefined;

  return (
    <div
      className={cn("rounded-full", className)}
      style={{
        ...getProgramMarketplaceLogoStyle(index, size),
        ...style,
      }}
    />
  );
}

const VIEW_ALL_CLUSTER = {
  originLeft: 138.29,
  originTop: 56,
  width: 137.03,
  height: 120.75,
} as const;

// Wispr Flow, Granola, Framer
const VIEW_ALL_LOGOS = [
  {
    index: 10,
    left: 156 - VIEW_ALL_CLUSTER.originLeft,
    top: 56 - VIEW_ALL_CLUSTER.originTop,
    size: 71,
    rotation: 11.4,
    ringClassName: "ring-[1px]",
    zIndex: 0,
    hoverClassName: "group-hover:-translate-y-1",
  },
  {
    index: 11,
    left: 204.32 - VIEW_ALL_CLUSTER.originLeft,
    top: 74.82 - VIEW_ALL_CLUSTER.originTop,
    size: 71,
    rotation: -22.07,
    ringClassName: "ring-4",
    zIndex: 10,
    hoverClassName: "group-hover:translate-x-1 group-hover:translate-y-0.5",
  },
  {
    index: 5,
    left: 138.29 - VIEW_ALL_CLUSTER.originLeft,
    top: 96 - VIEW_ALL_CLUSTER.originTop,
    size: 80.75,
    rotation: 4.84,
    ringClassName: "ring-4",
    zIndex: 20,
    hoverClassName: "group-hover:-translate-x-1 group-hover:translate-y-0.5",
  },
] as const;

export function ProgramMarketplaceLogosCluster({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn("relative", className)}
      style={{
        width: VIEW_ALL_CLUSTER.width,
        height: VIEW_ALL_CLUSTER.height,
      }}
    >
      {VIEW_ALL_LOGOS.map(
        ({
          index,
          left,
          top,
          size,
          rotation,
          ringClassName,
          zIndex,
          hoverClassName,
        }) => (
          <div
            key={index}
            className={cn(
              "absolute transition-transform duration-300 ease-out will-change-transform",
              hoverClassName,
            )}
            style={{ left, top, zIndex }}
          >
            <ProgramMarketplaceLogoSprite
              index={index}
              className={cn("ring-white", ringClassName)}
              style={{
                width: size,
                height: size,
                transform: `rotate(${rotation}deg)`,
              }}
            />
          </div>
        ),
      )}
    </div>
  );
}

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
            <ProgramMarketplaceLogoSprite
              index={index}
              className={cn(z && "drop-shadow-sm")}
              style={{
                transform: `rotate(${r}deg)`,
                width: `calc(var(--logo-size, 32px) * ${s})`,
                height: `calc(var(--logo-size, 32px) * ${s})`,
                zIndex: z,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
