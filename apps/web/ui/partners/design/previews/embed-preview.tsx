"use client";

import { ProgramWithLanderDataProps } from "@/lib/types";
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
    <div className="scrollbar-hide -mx-2 h-full w-auto overflow-y-auto px-2 pb-4">
      <PreviewWindow
        url={`https://${program.domain}`}
        showViewButton={false}
        className="h-auto rounded-b-xl bg-neutral-100"
        contentClassName="overflow-y-hidden"
      >
        <div
          className="relative z-0 mx-auto w-full select-none text-[var(--brand)]"
          style={
            {
              "--brand": brandColor || "#000000",
            } as CSSProperties
          }
          role="presentation"
        >
          {/* <svg
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            fill="none"
            viewBox="0 0 869 690"
            className="h-auto w-full [&_*]:tracking-[-0.035em]"
          > */}
        </div>
      </PreviewWindow>
    </div>
  );
}
