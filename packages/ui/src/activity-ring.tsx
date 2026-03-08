import { cn } from "@dub/utils";
import { ComponentType, SVGProps, useMemo } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface ActivityRingProps {
  /** Value for the positive/trustworthy side */
  positiveValue: number;
  /** Value for the negative/removed side */
  negativeValue: number;
  /** Size of the ring in pixels (default: 40) */
  size?: number;
  /** Icon to show when positive leads */
  positiveIcon?: IconComponent;
  /** Icon to show when negative leads */
  negativeIcon?: IconComponent;
  /** Icon to show when neutral (tie) */
  neutralIcon?: IconComponent;
  className?: string;
}

const COLORS = {
  positive: "#00C951", // green ring
  negative: "#FB2C36", // red ring
  neutral: "#e5e5e5", // neutral-200 for rings
  positiveIcon: "#166534", // green-800
  negativeIcon: "#991b1b", // red-800
  neutralIcon: "#262626", // neutral-800
};

// Gap angle in degrees at each connection point
const GAP_ANGLE = 15;

// Minimum arc sweep to ensure visibility when value > 0
const MIN_ARC_DEGREES = 30;

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

// Creates a filled arc segment (donut slice) between outer and inner radius
function describeFilledArc(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`, // Start at outer arc
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`, // Outer arc
    `L ${innerEnd.x} ${innerEnd.y}`, // Line to inner arc
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`, // Inner arc (reverse)
    "Z", // Close path
  ].join(" ");
}

type RingState = "positive" | "negative" | "neutral";

export function ActivityRing({
  positiveValue,
  negativeValue,
  size = 40,
  positiveIcon: PositiveIcon,
  negativeIcon: NegativeIcon,
  neutralIcon: NeutralIcon,
  className,
}: ActivityRingProps) {
  const state: RingState = useMemo(() => {
    if (positiveValue > negativeValue) return "positive";
    if (negativeValue > positiveValue) return "negative";
    return "neutral";
  }, [positiveValue, negativeValue]);

  // Calculate arc angles based on ratio
  const { positiveArc, negativeArc, showOnlyPositive, showOnlyNegative } =
    useMemo(() => {
      const total = positiveValue + negativeValue;

      // Available sweep angle (360 - 2 gaps)
      const availableSweep = 360 - GAP_ANGLE * 2;

      if (total === 0) {
        // Neutral: equal arcs at 50% each
        const halfSweep = availableSweep / 2;
        return {
          // Right side: from top going clockwise to bottom
          positiveArc: { start: GAP_ANGLE / 2, end: GAP_ANGLE / 2 + halfSweep },
          // Left side: from bottom going clockwise to top
          negativeArc: {
            start: 180 + GAP_ANGLE / 2,
            end: 180 + GAP_ANGLE / 2 + halfSweep,
          },
          showOnlyPositive: false,
          showOnlyNegative: false,
        };
      }

      // When one value is 0, show full circle of the other color (no gaps)
      if (positiveValue === 0) {
        return {
          positiveArc: { start: 0, end: 0 },
          negativeArc: { start: 0, end: 360 },
          showOnlyPositive: false,
          showOnlyNegative: true,
        };
      }

      if (negativeValue === 0) {
        return {
          positiveArc: { start: 0, end: 360 },
          negativeArc: { start: 0, end: 0 },
          showOnlyPositive: true,
          showOnlyNegative: false,
        };
      }

      const positiveRatio = positiveValue / total;

      // Calculate sweeps with minimum visibility
      let positiveSweep = positiveRatio * availableSweep;
      let negativeSweep = (1 - positiveRatio) * availableSweep;

      // Ensure minimum visibility for non-zero values
      if (positiveValue > 0 && positiveSweep < MIN_ARC_DEGREES) {
        positiveSweep = MIN_ARC_DEGREES;
        negativeSweep = availableSweep - MIN_ARC_DEGREES;
      }
      if (negativeValue > 0 && negativeSweep < MIN_ARC_DEGREES) {
        negativeSweep = MIN_ARC_DEGREES;
        positiveSweep = availableSweep - MIN_ARC_DEGREES;
      }

      return {
        // Right side: from top going clockwise
        positiveArc: {
          start: GAP_ANGLE / 2,
          end: GAP_ANGLE / 2 + positiveSweep,
        },
        // Left side: from where positive ends + gap, going clockwise
        negativeArc: {
          start: GAP_ANGLE / 2 + positiveSweep + GAP_ANGLE,
          end: GAP_ANGLE / 2 + positiveSweep + GAP_ANGLE + negativeSweep,
        },
        showOnlyPositive: false,
        showOnlyNegative: false,
      };
    }, [positiveValue, negativeValue]);

  const center = size / 2;
  const strokeWidth = 3;
  const outerRadius = (size - strokeWidth) / 2; // Stroke centered on this radius
  const fillOuterRadius = outerRadius - strokeWidth / 2; // Inner edge of stroke
  const fillInnerRadius = size * 0.28; // Inner radius for filled area

  const IconComponent = useMemo(() => {
    switch (state) {
      case "positive":
        return PositiveIcon;
      case "negative":
        return NegativeIcon;
      default:
        return NeutralIcon;
    }
  }, [state, PositiveIcon, NegativeIcon, NeutralIcon]);

  const iconColor = useMemo(() => {
    switch (state) {
      case "positive":
        return COLORS.positiveIcon;
      case "negative":
        return COLORS.negativeIcon;
      default:
        return COLORS.neutralIcon;
    }
  }, [state]);

  // Always use green and red colors
  const positiveColor = COLORS.positive;
  const negativeColor = COLORS.negative;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Full circle fill for 100% positive */}
        {showOnlyPositive && (
          <circle
            cx={center}
            cy={center}
            r={(fillOuterRadius + fillInnerRadius) / 2}
            fill="none"
            stroke={COLORS.positive}
            strokeWidth={fillOuterRadius - fillInnerRadius}
            opacity={0.1}
          />
        )}

        {/* Full circle fill for 100% negative */}
        {showOnlyNegative && (
          <circle
            cx={center}
            cy={center}
            r={(fillOuterRadius + fillInnerRadius) / 2}
            fill="none"
            stroke={COLORS.negative}
            strokeWidth={fillOuterRadius - fillInnerRadius}
            opacity={0.1}
          />
        )}

        {/* Filled arc for positive (behind stroke) - only when not full circle */}
        {positiveValue > 0 && !showOnlyPositive && (
          <path
            d={describeFilledArc(
              center,
              center,
              fillOuterRadius,
              fillInnerRadius,
              positiveArc.start,
              positiveArc.end,
            )}
            fill={COLORS.positive}
            opacity={0.1}
          />
        )}

        {/* Filled arc for negative (behind stroke) - only when not full circle */}
        {negativeValue > 0 && !showOnlyNegative && (
          <path
            d={describeFilledArc(
              center,
              center,
              fillOuterRadius,
              fillInnerRadius,
              negativeArc.start,
              negativeArc.end,
            )}
            fill={COLORS.negative}
            opacity={0.1}
          />
        )}

        {/* Full circle stroke for 100% positive */}
        {showOnlyPositive && (
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke={positiveColor}
            strokeWidth={strokeWidth}
          />
        )}

        {/* Full circle stroke for 100% negative */}
        {showOnlyNegative && (
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke={negativeColor}
            strokeWidth={strokeWidth}
          />
        )}

        {/* Positive arc stroke (right side) - only when not full circle */}
        {!showOnlyPositive && !showOnlyNegative && (
          <path
            d={describeArc(
              center,
              center,
              outerRadius,
              positiveArc.start,
              positiveArc.end,
            )}
            stroke={positiveColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Negative arc stroke (left side) - only when not full circle */}
        {!showOnlyPositive && !showOnlyNegative && (
          <path
            d={describeArc(
              center,
              center,
              outerRadius,
              negativeArc.start,
              negativeArc.end,
            )}
            stroke={negativeColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )}
      </svg>

      {/* Centered icon */}
      {IconComponent && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: iconColor }}
        >
          <IconComponent className="size-3.5" />
        </div>
      )}
    </div>
  );
}
