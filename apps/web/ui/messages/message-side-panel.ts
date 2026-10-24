import { cn } from "@dub/utils";

/**
 * `null` is the responsive default: the panel stays closed below the `sm`
 * breakpoint (where it is full-width) and open from `sm` up.
 */
export type MessageSidePanelState = boolean | null;

export function nextMessageSidePanelOpen(
  isOpen: MessageSidePanelState,
  isAtLeastSm: boolean,
) {
  return !(isOpen ?? isAtLeastSm);
}

const PANEL_WIDTH = {
  program: {
    // Full class strings so Tailwind can see them.
    open: "w-full sm:w-[340px]",
    responsive: "sm:w-[340px]",
    inline: "@[960px]/page:shadow-none @[960px]/page:relative",
  },
  partner: {
    open: "w-full sm:w-[400px]",
    responsive: "sm:w-[400px]",
    inline: "@[1082px]/page:shadow-none @[1082px]/page:relative",
  },
} as const;

export function messageSidePanelClassName(
  isOpen: MessageSidePanelState,
  variant: keyof typeof PANEL_WIDTH,
) {
  const panel = PANEL_WIDTH[variant];

  return cn(
    "absolute right-0 top-0 h-full min-h-0 w-0 overflow-hidden bg-white shadow-lg transition-[width]",
    panel.inline,
    isOpen === true && panel.open,
    isOpen === null && panel.responsive,
  );
}
