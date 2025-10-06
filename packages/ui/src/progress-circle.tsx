import { cn } from "@dub/utils";

export function ProgressCircle({
  progress: progressProp,
  strokeWidth = 16,
  className,
}: {
  progress: number;
  strokeWidth?: number;
  className?: string;
}) {
  const progress = Math.min(Math.max(progressProp, 0), 1);

  const radius = (100 - strokeWidth) / 2;
  const circumference = radius * Math.PI * 2;
  const dash = progress * circumference;

  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      className={cn(
        "size-3 shrink-0 text-green-600 [--track-color:#e5e5e5]",
        className,
      )}
    >
      <circle
        cx="50"
        cy="50"
        r={radius}
        strokeWidth={`${strokeWidth}px`}
        fill="none"
        strokeLinecap="round"
        className="stroke-[var(--track-color)]"
      />
      {progress > 0 && (
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth={`${strokeWidth}px`}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{
            transformOrigin: "50px 50px",
            transform: `rotate(-90deg)`,
          }}
        />
      )}
    </svg>
  );
}
