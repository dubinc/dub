import { cn } from "@dub/utils";

// Two copies of the band drift in opposite directions, so the colors shift as they overlap
const LAYERS = [
  "animate-aurora [--aurora-direction:90deg]",
  "animate-aurora-reverse opacity-50 [--aurora-direction:270deg]",
];

/**
 * A blurred, full-width gradient band that sits just above the container so only
 * its glow spills in. The masks fade it out downward and to 0% at the left and right edges.
 */
export function AuroraGradient() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-20 [mask-composite:intersect] [mask-image:linear-gradient(black,transparent),linear-gradient(90deg,transparent,black_15%,black_85%,transparent)]"
      aria-hidden="true"
    >
      {LAYERS.map((layer) => (
        <div
          key={layer}
          className={cn(
            "absolute -top-10 left-[-20%] h-[29px] w-[140%] origin-top blur-[28px] will-change-transform motion-reduce:animate-none",
            "bg-[linear-gradient(var(--aurora-direction),transparent_0%,#1200D8_14.3%,#F0753C_28.6%,#D3DD92_42.9%,#59824F_57.1%,#2874D7_71.4%,#99C2FF_85.7%,transparent_100%)]",
            layer,
          )}
        />
      ))}
    </div>
  );
}
