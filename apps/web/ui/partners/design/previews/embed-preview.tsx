"use client";

import { ProgramWithLanderDataProps } from "@/lib/types";
import { OG_AVATAR_URL } from "@dub/utils";
import { CSSProperties, useId } from "react";
import { useWatch } from "react-hook-form";
import { useBrandingFormContext } from "../branding-form";
import { PreviewWindow } from "../preview-window";

export function EmbedPreview({
  program,
}: {
  program: ProgramWithLanderDataProps;
}) {
  const id = useId();

  const { getValues } = useBrandingFormContext();
  const { brandColor, logo } = {
    ...useWatch(),
    ...getValues(),
  };

  return (
    <div className="scrollbar-hide @container -mx-2 h-full w-auto overflow-y-auto px-2 pb-4">
      <PreviewWindow
        url={program.url!}
        showViewButton={false}
        className="h-auto rounded-b-xl bg-neutral-100"
        contentClassName="overflow-y-hidden"
      >
        <div className="@[800px]:p-16 @[800px]:gap-12 grid grid-cols-[minmax(0,1fr)_minmax(0,5fr)] gap-8 p-8">
          <div>
            <img
              className="@[800px]:size-11 size-6"
              src={program.logo || `${OG_AVATAR_URL}${program.name}`}
            />
            <div className="@[800px]:mt-6 @[800px]:gap-4 mt-4 flex flex-col gap-2">
              {[100, 90, 70, 80, 65].map((p, idx) => (
                <div
                  key={idx}
                  className="h-4 rounded bg-neutral-200"
                  style={{ width: `${p}%` }}
                />
              ))}
            </div>
          </div>
          <div
            className="relative z-0 mx-auto w-full select-none text-[var(--brand)]"
            style={
              {
                "--brand": brandColor || "#000000",
              } as CSSProperties
            }
            role="presentation"
          >
            <div className="relative rounded-xl bg-neutral-100">
              <StudsPattern />
              {/* Inner shadow on top of studs */}
              <div className="absolute inset-0 rounded-xl shadow-[0_12px_20px_0_#00000026_inset,0_2px_5px_0_#00000026_inset,0_2px_13px_2px_#FFFFFF59]" />

              <div className="@[800px]:-translate-y-10 @[800px]:translate-x-10 @[800px]:rotate-[2.4deg] relative h-96 rounded-xl border border-neutral-200 bg-white drop-shadow-lg" />
            </div>
            {/* <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            fill="none"
            viewBox="0 0 869 690"
            className="h-auto w-full [&_*]:tracking-[-0.035em]"
          > */}
          </div>
        </div>
      </PreviewWindow>
    </div>
  );
}

function StudsPattern() {
  const id = useId();

  const cellSize = 42;
  const circleRadius = 8;

  // An SVG pattern of circles
  return (
    <svg
      className="pointer-events-none absolute inset-0 text-neutral-100"
      width="100%"
      height="100%"
    >
      <defs>
        <linearGradient
          id={`gradient-${id}`}
          x1="0"
          y1="1"
          x2="1"
          y2="0"
          gradientUnits="objectBoundingBox"
        >
          <stop stopColor="currentColor" offset="0.5" />
          <stop stopColor="white" offset="1" />
        </linearGradient>
        <pattern
          id={`pattern-${id}`}
          x={6}
          y={6}
          width={cellSize}
          height={cellSize}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={cellSize / 2}
            cy={cellSize / 2}
            r={circleRadius}
            fill={`url(#gradient-${id})`}
          />
        </pattern>
      </defs>
      <rect
        fill={`url(#pattern-${id})`}
        width="100%"
        height="100%"
        className="[filter:drop-shadow(0_1px_2px_#0002)_drop-shadow(0_4px_8px_#0002)]"
      />
    </svg>
  );
}
