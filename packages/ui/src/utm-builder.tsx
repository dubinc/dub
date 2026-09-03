"use client";

import { cn } from "@dub/utils";
import {
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  Ref,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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

export type UTMSuggestion = {
  value: string;
  description?: string;
};

function getOpenMacroToken(
  value: string,
  caret: number,
): { start: number; query: string } | null {
  const before = value.slice(0, caret);
  const openIdx = before.lastIndexOf("{{");
  if (openIdx === -1) return null;

  const afterOpen = before.slice(openIdx + 2);
  if (afterOpen.includes("}")) return null;

  return { start: openIdx, query: afterOpen };
}

function filterSuggestions(
  suggestions: UTMSuggestion[],
  query: string,
): UTMSuggestion[] {
  const q = query.toLowerCase();
  if (!q) return suggestions;

  return suggestions.filter((s) => {
    const value = s.value.toLowerCase();
    return value.includes(q) || value.slice(2).startsWith(q);
  });
}

function UTMInput({
  id,
  inputRef,
  placeholder,
  disabled,
  disabledTooltip,
  value,
  onChange,
  suggestions,
}: {
  id: string;
  inputRef?: Ref<HTMLInputElement>;
  placeholder: string;
  disabled?: boolean;
  disabledTooltip?: string | ReactNode;
  value: string;
  onChange: (value: string) => void;
  suggestions?: UTMSuggestion[];
}) {
  const localRef = useRef<HTMLInputElement | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const filtered =
    suggestions && menuOpen ? filterSuggestions(suggestions, query) : [];

  const setInputRef = (el: HTMLInputElement | null) => {
    localRef.current = el;
    if (!inputRef) return;
    if (typeof inputRef === "function") {
      inputRef(el);
    } else {
      inputRef.current = el;
    }
  };

  const updateMenuPosition = () => {
    const el = localRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 50,
    });
  };

  const updateAutocomplete = (nextValue: string, caret: number) => {
    if (!suggestions?.length) {
      setMenuOpen(false);
      return;
    }

    const token = getOpenMacroToken(nextValue, caret);
    setQuery(token ? token.query : nextValue);
    setHighlightedIndex(0);
    updateMenuPosition();
    setMenuOpen(true);
  };

  const insertSuggestion = (suggestion: UTMSuggestion) => {
    const input = localRef.current;
    const caret = input?.selectionStart ?? value.length;
    const token = getOpenMacroToken(value, caret);

    const nextValue = token
      ? value.slice(0, token.start) + suggestion.value + value.slice(caret)
      : suggestion.value;
    const nextCaret = token
      ? token.start + suggestion.value.length
      : suggestion.value.length;

    onChange(nextValue);
    setMenuOpen(false);

    requestAnimationFrame(() => {
      const el = localRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!menuOpen || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % filtered.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      insertSuggestion(filtered[highlightedIndex]);
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setMenuOpen(false);
    }
  };

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!menuOpen) return;

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [menuOpen]);

  return (
    <div className="relative min-w-0 grow">
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
          id={id}
          ref={setInputRef}
          placeholder={placeholder}
          disabled={disabled || Boolean(disabledTooltip)}
          className="size-full rounded-r-md border border-neutral-300 placeholder-neutral-400 focus:border-neutral-500 focus:ring-neutral-500 disabled:cursor-not-allowed sm:text-sm"
          value={value}
          onChange={(e) => {
            const nextValue = e.target.value;
            onChange(nextValue);
            updateAutocomplete(
              nextValue,
              e.target.selectionStart ?? nextValue.length,
            );
          }}
          onSelect={(e) => {
            const target = e.currentTarget;
            updateAutocomplete(
              target.value,
              target.selectionStart ?? target.value.length,
            );
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => setMenuOpen(false), 150);
          }}
          onFocus={(e) => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
              blurTimeoutRef.current = null;
            }
            updateAutocomplete(
              e.currentTarget.value,
              e.currentTarget.selectionStart ?? e.currentTarget.value.length,
            );
          }}
        />
      </DynamicTooltipWrapper>

      {menuOpen &&
        filtered.length > 0 &&
        createPortal(
          <div
            style={menuStyle}
            className="border-border-subtle flex flex-col rounded-lg border bg-white p-1 shadow-sm"
          >
            {filtered.map((suggestion, index) => (
              <button
                key={suggestion.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertSuggestion(suggestion)}
                onPointerEnter={() => setHighlightedIndex(index)}
                data-selected={highlightedIndex === index}
                className={cn(
                  "flex cursor-pointer select-none flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left",
                  "data-[selected=true]:bg-neutral-100",
                )}
              >
                <span className="font-mono text-sm text-neutral-950">
                  {suggestion.value}
                </span>
                {suggestion.description && (
                  <span className="text-content-subtle text-xs">
                    {suggestion.description}
                  </span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function UTMBuilder({
  values,
  onChange,
  disabled,
  autoFocus,
  disabledTooltip,
  className,
  suggestions,
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
  suggestions?: UTMSuggestion[];
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
                <UTMInput
                  id={`${id}-${key}`}
                  inputRef={idx === 0 ? inputRef : undefined}
                  placeholder={placeholder}
                  disabled={disabled}
                  disabledTooltip={disabledTooltip}
                  value={values[key] || ""}
                  onChange={(value) => onChange(key, value)}
                  suggestions={suggestions}
                />
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}
