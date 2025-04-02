"use client";

import { cn } from "@dub/utils";
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import { useMediaQuery } from "./hooks/use-media-query";
import {
  Flag6,
  Gift,
  GlobePointer,
  InputSearch,
  Page2,
  SatelliteDish,
} from "./icons/nucleo";
import { DynamicTooltipWrapper, Tooltip } from "./tooltip";

export const UTM_PARAMETERS = [
  {
    key: "utm_source",
    icon: GlobePointer,
    label: "Source",
    placeholder: "google",
    description: "Where the traffic is coming from",
  },
  {
    key: "utm_medium",
    icon: SatelliteDish,
    label: "Medium",
    placeholder: "cpc",
    description: "How the traffic is coming",
  },
  {
    key: "utm_campaign",
    icon: Flag6,
    label: "Campaign",
    placeholder: "summer sale",
    description: "The name of the campaign",
  },
  {
    key: "utm_term",
    icon: InputSearch,
    label: "Term",
    placeholder: "running shoes",
    description: "The term of the campaign",
  },
  {
    key: "utm_content",
    icon: Page2,
    label: "Content",
    placeholder: "logo link",
    description: "The content of the campaign",
  },
  {
    key: "ref",
    icon: Gift,
    label: "Referral",
    placeholder: "yoursite.com",
    description: "The referral of the campaign",
  },
] as const;

export function UTMBuilder({
  values,
  onChange,
  disabled,
  autoFocus,
  disabledTooltip,
  className,
}: {
  values: Record<
    (typeof UTM_PARAMETERS)[number]["key"],
    string | null | undefined
  >;
  onChange: (
    key: (typeof UTM_PARAMETERS)[number]["key"],
    value: string,
  ) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  disabledTooltip?: string | ReactNode;
  className?: string;
}) {
  const { isMobile } = useMediaQuery();

  const id = useId();
  const [showParams, setShowParams] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Hacky fix to focus the input automatically in modals where normally it doesn't work
  useEffect(() => {
    if (inputRef.current && !isMobile && autoFocus)
      setTimeout(() => inputRef.current?.focus(), 10);
  }, []);

  return (
    <div className={cn("grid gap-y-3", className)}>
      {UTM_PARAMETERS.map(
        ({ key, icon: Icon, label, placeholder, description }, idx) => {
          return (
            <div key={key} className="group relative">
              <div className="relative z-10 flex">
                <Tooltip
                  content={
                    <div className="p-3 text-center text-xs">
                      <p className="text-neutral-600">{description}</p>
                      <span className="font-mono text-neutral-400">{key}</span>
                    </div>
                  }
                  sideOffset={4}
                  disableHoverableContent
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-l-md border-y border-l border-neutral-300 bg-neutral-50 px-3 py-1.5 text-neutral-700",
                      showParams ? "sm:min-w-36" : "sm:min-w-28",
                    )}
                    onClick={() => setShowParams((s) => !s)}
                  >
                    <Icon className="size-4 shrink-0" />
                    <label
                      htmlFor={`${id}-${key}`}
                      className="select-none text-sm"
                    >
                      {showParams ? (
                        <span className="font-mono text-xs">{key}</span>
                      ) : (
                        label
                      )}
                    </label>
                  </div>
                </Tooltip>
                <div className="min-w-0 grow">
                  <DynamicTooltipWrapper
                    tooltipProps={
                      disabledTooltip
                        ? {
                            content: disabledTooltip,
                            disableHoverableContent: true,
                          }
                        : undefined
                    }
                  >
                    <input
                      type="text"
                      id={`${id}-${key}`}
                      ref={idx === 0 ? inputRef : undefined}
                      placeholder={placeholder}
                      disabled={disabled || Boolean(disabledTooltip)}
                      className="size-full rounded-r-md border border-neutral-300 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500 disabled:cursor-not-allowed sm:text-sm"
                      value={values[key] || ""}
                      onChange={(e) => onChange(key, e.target.value)}
                    />
                  </DynamicTooltipWrapper>
                </div>
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}
