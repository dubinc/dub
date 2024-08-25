import { PropsWithChildren } from "react";

export type GaugeProps = PropsWithChildren<{
  value: number;
  min?: number;
  max: number;
}>;

export function Gauge({ value, min = 0, max, children }: GaugeProps) {
  const fraction = (value - min) / (max - min);
  const gradientStop = fraction * 50;

  return (
    <div className="flex size-full max-w-[115px] items-center justify-center">
      <div className="relative flex aspect-[2/1] w-full items-end justify-center overflow-hidden pb-1">
        <div className="absolute left-0 top-0 aspect-square w-full">
          <div className="absolute inset-px rounded-full border border-gray-200" />

          <div
            className="absolute inset-0 rounded-full"
            style={{
              backgroundImage: `conic-gradient(from -90deg,#743ad5 0%, #d53a9d ${gradientStop}%, transparent ${gradientStop}%)`,
            }}
          />

          <div className="absolute inset-[3px] rounded-full bg-white" />
        </div>
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}
