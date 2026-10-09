"use client";

import { AI_REWARD_EVENTS } from "@/lib/ai/ai-reward-schema";
import {
  reviewRewardTooltipConsistency,
  screenRewardTooltipContradiction,
} from "@/lib/ai/review-reward-tooltip";
import type {
  PayoutFix,
  ReviewRewardTooltipModifier,
  RewardPayout,
  TooltipSuggestion,
} from "@/lib/ai/review-reward-tooltip-schema";
import {
  getRewardConditionAttribute,
  getTooltipSuggestionPages,
  isRewardConditionComplete,
  stripRewardTooltipMarkdown,
  type TooltipSuggestionField,
} from "@/lib/rewards/validate-tooltip-suggestion";
import { EventType } from "@prisma/client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const DEBOUNCE_MS = 700;
const HIDE_MS = 300;

type ReviewCacheEntry = {
  suggestions: TooltipSuggestion[];
  payoutFixes: PayoutFix[];
  note: string | null;
};

const EMPTY_REVIEW: ReviewCacheEntry = {
  suggestions: [],
  payoutFixes: [],
  note: null,
};

const reviewCache = new Map<string, ReviewCacheEntry>();

export function tooltipSuggestionPageKey({
  modifierIndex,
  conditionIndex,
  field,
}: {
  modifierIndex: number;
  conditionIndex: number;
  field: TooltipSuggestionField;
}) {
  return `${modifierIndex}:${conditionIndex}:${field}`;
}

export const RewardTooltipConsistencyContext = createContext<ReturnType<
  typeof useRewardTooltipConsistency
> | null>(null);

export function useRewardTooltipConsistencyContext() {
  return useContext(RewardTooltipConsistencyContext);
}

export function useRewardTooltipConsistency({
  workspaceId,
  event,
  tooltipDescription,
  description,
  baseReward,
  modifiers,
  onApply,
  onApplyPayout,
}: {
  workspaceId?: string;
  event: EventType;
  tooltipDescription?: string | null;
  description?: string | null;
  baseReward?: {
    type?: string | null;
    amount?: number | null;
    maxDuration?: number | null;
  } | null;
  modifiers?: Array<{
    operator?: "AND" | "OR";
    type?: string | null;
    amountInCents?: number | null;
    amountInPercentage?: number | null;
    maxDuration?: number | null;
    conditions?: Array<{
      entity?: string;
      attribute?: string;
      operator?: string;
      value?: unknown;
      label?: string | null;
      metadataField?: string;
    } | null>;
  } | null> | null;
  onApply?: (suggestion: TooltipSuggestion) => void;
  onApplyPayout?: (fixes: PayoutFix[]) => void;
}) {
  const [suggestions, setSuggestions] = useState<TooltipSuggestion[]>([]);
  const [payoutFixes, setPayoutFixes] = useState<PayoutFix[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([]);
  const requestIdRef = useRef(0);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const badgeRefs = useRef(new Map<string, HTMLElement>());
  const activeAnchorRef = useRef<HTMLElement | null>(null);
  const popoverContentRef = useRef<HTMLDivElement | null>(null);
  const returnFocusOnCloseRef = useRef(false);

  const tooltip = stripRewardTooltipMarkdown(tooltipDescription ?? "");
  const serializedReward = serializeRewardForReview({
    event,
    description,
    baseReward,
    modifiers,
  });
  const serializedModifiers = serializedReward?.modifiers ?? null;
  const cacheKey =
    workspaceId && tooltip && serializedReward
      ? JSON.stringify({ event, tooltip, reward: serializedReward })
      : null;

  const serializedRewardRef = useRef(serializedReward);
  serializedRewardRef.current = serializedReward;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const reward = serializedRewardRef.current;

    const show = (entry: ReviewCacheEntry) => {
      setSuggestions(entry.suggestions);
      setPayoutFixes(entry.payoutFixes);
      setNote(entry.note);
      setReviewing(false);
      setActiveIndex(0);
    };

    const cached = cacheKey ? reviewCache.get(cacheKey) : undefined;
    show(cached ?? EMPTY_REVIEW);

    if (!cacheKey || !reward || cached) return;

    const input = { workspaceId, event, tooltip, ...reward };
    const timeout = window.setTimeout(async () => {
      const { flagged } = await screenRewardTooltipContradiction(input).catch(
        () => ({ flagged: null }),
      );

      if (requestId !== requestIdRef.current || flagged === null) return;

      if (!flagged) {
        reviewCache.set(cacheKey, EMPTY_REVIEW);
        return;
      }

      setReviewing(true);

      const result = await reviewRewardTooltipConsistency(input).catch(
        () => null,
      );

      if (requestId !== requestIdRef.current) return;

      const suggestions = result?.suggestions ?? [];
      const payoutFixes = result?.payoutFixes ?? [];
      const entry = {
        suggestions,
        payoutFixes,
        note:
          suggestions.length || payoutFixes.length
            ? null
            : result?.note || "This copy doesn't match the reward payout.",
      };

      reviewCache.set(cacheKey, entry);
      show(entry);
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [cacheKey, event, tooltip, workspaceId]);

  const visibleSuggestions = useMemo(() => {
    if (!serializedModifiers?.length) return [];

    return suggestions.filter((suggestion) => {
      const current =
        serializedModifiers[suggestion.modifierIndex]?.conditions[
          suggestion.conditionIndex
        ];

      if (!current) return false;

      return !dismissedKeys.includes(dismissalKey(suggestion, current));
    });
  }, [dismissedKeys, serializedModifiers, suggestions]);

  const pages = useMemo(
    () =>
      serializedModifiers
        ? getTooltipSuggestionPages({
            suggestions: visibleSuggestions,
            modifiers: serializedModifiers,
          })
        : [],
    [serializedModifiers, visibleSuggestions],
  );
  useEffect(() => {
    if (activeIndex >= pages.length) {
      setActiveIndex(0);
    }

    if (!pages.length && open) {
      setOpen(false);
    }
  }, [activeIndex, open, pages.length]);

  const cancelHide = useCallback(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }
  }, []);

  const registerBadge = useCallback(
    (key: string, element: HTMLElement | null) => {
      if (element) {
        badgeRefs.current.set(key, element);
      } else {
        badgeRefs.current.delete(key);
      }
    },
    [],
  );

  const showPage = useCallback(
    (index: number) => {
      cancelHide();

      const page = pages[index];
      if (page) {
        const element = badgeRefs.current.get(
          tooltipSuggestionPageKey({
            modifierIndex: page.suggestion.modifierIndex,
            conditionIndex: page.suggestion.conditionIndex,
            field: page.field,
          }),
        );

        if (element) {
          activeAnchorRef.current = element;
        }
      }

      setActiveIndex(index);
      setOpen(true);
    },
    [cancelHide, pages],
  );

  const focusPopoverContent = useCallback(() => {
    returnFocusOnCloseRef.current = true;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        popoverContentRef.current
          ?.querySelector<HTMLElement>("button")
          ?.focus();
      });
    });
  }, []);

  const handlePopoverCloseAutoFocus = useCallback((event: Event) => {
    if (!returnFocusOnCloseRef.current) return;

    event.preventDefault();
    returnFocusOnCloseRef.current = false;
    activeAnchorRef.current?.focus();
  }, []);

  const scheduleHide = useCallback(() => {
    cancelHide();
    closeTimerRef.current = window.setTimeout(() => {
      if (popoverContentRef.current?.contains(document.activeElement)) return;
      setOpen(false);
    }, HIDE_MS);
  }, [cancelHide]);

  const hide = useCallback(() => {
    cancelHide();
    setOpen(false);
  }, [cancelHide]);

  const getSuggestion = useCallback(
    (modifierIndex: number, conditionIndex: number) =>
      visibleSuggestions.find(
        (suggestion) =>
          suggestion.modifierIndex === modifierIndex &&
          suggestion.conditionIndex === conditionIndex,
      ),
    [visibleSuggestions],
  );

  const getPageIndex = useCallback(
    (
      modifierIndex: number,
      conditionIndex: number,
      field: TooltipSuggestionField,
    ) =>
      pages.findIndex(
        (page) =>
          page.field === field &&
          page.suggestion.modifierIndex === modifierIndex &&
          page.suggestion.conditionIndex === conditionIndex,
      ),
    [pages],
  );

  const dismiss = useCallback(
    (suggestion: TooltipSuggestion) => {
      const current =
        serializedModifiers?.[suggestion.modifierIndex]?.conditions[
          suggestion.conditionIndex
        ];

      if (!current) return;

      const key = dismissalKey(suggestion, current);
      setDismissedKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));

      const cached = cacheKey ? reviewCache.get(cacheKey) : undefined;
      if (cacheKey && cached) {
        reviewCache.set(cacheKey, {
          ...cached,
          suggestions: cached.suggestions.filter(
            (entry) =>
              entry.modifierIndex !== suggestion.modifierIndex ||
              entry.conditionIndex !== suggestion.conditionIndex,
          ),
        });
      }

      hide();
    },
    [cacheKey, hide, serializedModifiers],
  );

  const dismissAll = useCallback(() => {
    if (!serializedModifiers) return;

    const cached = cacheKey ? reviewCache.get(cacheKey) : undefined;
    if (cacheKey && cached) {
      reviewCache.set(cacheKey, { ...cached, suggestions: [] });
    }

    setDismissedKeys((keys) => {
      const next = new Set(keys);

      for (const suggestion of suggestions) {
        const current =
          serializedModifiers[suggestion.modifierIndex]?.conditions[
            suggestion.conditionIndex
          ];

        if (current) {
          next.add(dismissalKey(suggestion, current));
        }
      }

      return [...next];
    });

    hide();
  }, [cacheKey, hide, serializedModifiers, suggestions]);

  const accept = useCallback(
    (suggestion: TooltipSuggestion) => {
      onApply?.(suggestion);
      dismiss(suggestion);
    },
    [dismiss, onApply],
  );

  const acceptAll = useCallback(() => {
    visibleSuggestions.forEach((suggestion) => onApply?.(suggestion));
    dismissAll();
  }, [dismissAll, onApply, visibleSuggestions]);

  const dismissNote = useCallback(() => {
    setNote(null);
    setPayoutFixes([]);

    if (!cacheKey) return;

    const cached = reviewCache.get(cacheKey);
    if (cached) {
      reviewCache.set(cacheKey, {
        ...cached,
        note: null,
        payoutFixes: [],
      });
    }
  }, [cacheKey]);

  const acceptPayouts = useCallback(() => {
    onApplyPayout?.(payoutFixes);
    dismissNote();
  }, [dismissNote, onApplyPayout, payoutFixes]);

  return {
    reviewing,
    pages,
    activeIndex,
    open,
    activeAnchorRef,
    registerBadge,
    popoverContentRef,
    showPage,
    focusPopoverContent,
    handlePopoverCloseAutoFocus,
    scheduleHide,
    cancelHide,
    hide,
    getSuggestion,
    getPageIndex,
    accept,
    acceptAll,
    dismiss,
    dismissAll,
    note,
    payoutFixes,
    acceptPayouts,
    dismissNote,
  };
}

function dismissalKey(
  suggestion: TooltipSuggestion,
  current: { operator: string; value: unknown },
) {
  return [
    suggestion.modifierIndex,
    suggestion.conditionIndex,
    current.operator,
    JSON.stringify(current.value),
    suggestion.suggested.operator ?? "",
    JSON.stringify(suggestion.suggested.value ?? null),
  ].join(":");
}

function serializeRewardForReview({
  event,
  description,
  baseReward,
  modifiers,
}: {
  event: EventType;
  description?: string | null;
  baseReward?: {
    type?: string | null;
    amount?: number | null;
    maxDuration?: number | null;
  } | null;
  modifiers?: Array<{
    operator?: "AND" | "OR";
    type?: string | null;
    amountInCents?: number | null;
    amountInPercentage?: number | null;
    maxDuration?: number | null;
    conditions?: Array<{
      entity?: string;
      attribute?: string;
      operator?: string;
      value?: unknown;
      label?: string | null;
      metadataField?: string;
    } | null>;
  } | null> | null;
}): {
  description: string | null;
  basePayout: RewardPayout;
  modifiers: ReviewRewardTooltipModifier[];
} | null {
  if (baseReward?.type !== "flat" && baseReward?.type !== "percentage") {
    return null;
  }
  if (!(AI_REWARD_EVENTS as readonly string[]).includes(event)) return null;
  const reviewModifiers = modifiers ?? [];
  if (
    !reviewModifiers.every(
      (modifier) =>
        !!modifier?.conditions?.length &&
        modifier.conditions.every((condition) =>
          isRewardConditionComplete({ event, condition }),
        ),
    )
  ) {
    return null;
  }

  const basePayout: RewardPayout = {
    type: baseReward.type,
    amount: baseReward.amount ?? null,
    maxDuration: normalizeDuration(baseReward.maxDuration),
  };
  const shownAs = stripRewardTooltipMarkdown(description ?? "");

  return {
    description: shownAs || null,
    basePayout,
    modifiers: reviewModifiers.map((modifier) => {
      const type =
        modifier?.type === "flat" || modifier?.type === "percentage"
          ? modifier.type
          : basePayout.type;
      const amount =
        type === "percentage"
          ? modifier?.amountInPercentage ??
            (basePayout.type === "percentage" ? basePayout.amount : null)
          : modifier?.amountInCents ??
            (basePayout.type === "flat" ? basePayout.amount : null);

      return {
        operator: modifier?.operator ?? "AND",
        payout: {
          type,
          amount: amount ?? null,
          maxDuration:
            modifier?.maxDuration === undefined
              ? basePayout.maxDuration
              : normalizeDuration(modifier.maxDuration),
        },
        conditions: (modifier?.conditions ?? []).map((condition) => {
          const attribute = getRewardConditionAttribute({
            event,
            entity: condition?.entity,
            attribute: condition?.attribute,
          });

          let value = condition?.value;
          if (
            attribute &&
            ["number", "currency", "date"].includes(attribute.type) &&
            !Array.isArray(value)
          ) {
            value = Number(value);
          }

          return {
            entity: condition!.entity!,
            attribute: condition!.attribute!,
            operator: condition!
              .operator as ReviewRewardTooltipModifier["conditions"][number]["operator"],
            value:
              value as ReviewRewardTooltipModifier["conditions"][number]["value"],
            label: condition?.label,
            metadataField: condition?.metadataField,
          };
        }),
      };
    }),
  };
}

function normalizeDuration(maxDuration: number | null | undefined) {
  if (maxDuration == null || !Number.isFinite(maxDuration)) return null;
  return maxDuration;
}
