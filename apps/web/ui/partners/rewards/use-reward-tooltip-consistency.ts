"use client";

import {
  AI_REWARD_EVENTS,
  type AIRewardEvent,
} from "@/lib/ai/ai-reward-schema";
import { reviewRewardTooltipConsistency } from "@/lib/ai/review-reward-tooltip";
import type {
  ReviewRewardTooltipModifier,
  TooltipSuggestion,
} from "@/lib/ai/review-reward-tooltip-schema";
import {
  getRewardConditionAttribute,
  isRewardConditionComplete,
  stripRewardTooltipMarkdown,
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

const DEBOUNCE_MS = 200;
const reviewCache = new Map<string, TooltipSuggestion[]>();

type RewardTooltipConsistencyValue = {
  suggestions: TooltipSuggestion[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  getSuggestion: (
    modifierIndex: number,
    conditionIndex: number,
  ) => TooltipSuggestion | undefined;
  accept: (suggestion: TooltipSuggestion) => void;
  acceptAll: () => void;
  dismiss: (suggestion: TooltipSuggestion) => void;
  dismissAll: () => void;
};

export const RewardTooltipConsistencyContext =
  createContext<RewardTooltipConsistencyValue | null>(null);

export function useRewardTooltipConsistencyContext() {
  return useContext(RewardTooltipConsistencyContext);
}

export function useRewardTooltipConsistency({
  workspaceId,
  event,
  tooltipDescription,
  modifiers,
  onApply,
}: {
  workspaceId?: string;
  event: EventType;
  tooltipDescription?: string | null;
  modifiers?: Array<{
    operator?: "AND" | "OR";
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
}): RewardTooltipConsistencyValue {
  const [suggestions, setSuggestions] = useState<TooltipSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([]);
  const requestIdRef = useRef(0);

  const tooltip = stripRewardTooltipMarkdown(tooltipDescription ?? "");
  const serializedModifiers = useMemo(
    () => serializeModifiersForReview({ event, modifiers }),
    [event, modifiers],
  );

  const cacheKey = useMemo(() => {
    if (
      !workspaceId ||
      !isAiRewardEvent(event) ||
      !tooltip ||
      !serializedModifiers
    ) {
      return null;
    }

    return JSON.stringify({
      event,
      tooltip,
      modifiers: serializedModifiers,
    });
  }, [event, serializedModifiers, tooltip, workspaceId]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (!cacheKey || !workspaceId || !isAiRewardEvent(event)) {
      setSuggestions([]);
      setActiveIndex(0);
      return;
    }

    const cached = reviewCache.get(cacheKey);
    if (cached) {
      setSuggestions(cached);
      setActiveIndex(0);
      return;
    }

    setSuggestions([]);
    setActiveIndex(0);
    const timeout = window.setTimeout(async () => {
      try {
        const result = await reviewRewardTooltipConsistency({
          workspaceId,
          event,
          tooltip,
          modifiers: serializedModifiers,
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        const next = result.suggestions ?? [];
        reviewCache.set(cacheKey, next);
        setSuggestions(next);
        setActiveIndex(0);
      } catch {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setSuggestions([]);
        setActiveIndex(0);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [cacheKey, event, serializedModifiers, tooltip, workspaceId]);

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

  useEffect(() => {
    if (activeIndex >= visibleSuggestions.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, visibleSuggestions.length]);

  const getSuggestion = useCallback(
    (modifierIndex: number, conditionIndex: number) =>
      visibleSuggestions.find(
        (suggestion) =>
          suggestion.modifierIndex === modifierIndex &&
          suggestion.conditionIndex === conditionIndex,
      ),
    [visibleSuggestions],
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
    },
    [serializedModifiers],
  );

  const dismissAll = useCallback(() => {
    if (!serializedModifiers) return;

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
  }, [serializedModifiers, suggestions]);

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

  return {
    suggestions: visibleSuggestions,
    activeIndex,
    setActiveIndex,
    getSuggestion,
    accept,
    acceptAll,
    dismiss,
    dismissAll,
  };
}

function isAiRewardEvent(event: EventType): event is AIRewardEvent {
  return (AI_REWARD_EVENTS as readonly string[]).includes(event);
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

function serializeModifiersForReview({
  event,
  modifiers,
}: {
  event: EventType;
  modifiers?: Array<{
    operator?: "AND" | "OR";
    conditions?: Array<{
      entity?: string;
      attribute?: string;
      operator?: string;
      value?: unknown;
      label?: string | null;
      metadataField?: string;
    } | null>;
  } | null> | null;
}): ReviewRewardTooltipModifier[] | null {
  if (!isAiRewardEvent(event) || !modifiers?.length) return null;
  if (
    !modifiers.every(
      (modifier) =>
        !!modifier?.conditions?.length &&
        modifier.conditions.every((condition) =>
          isRewardConditionComplete({ event, condition }),
        ),
    )
  ) {
    return null;
  }

  return (modifiers ?? []).map((modifier) => ({
    operator: modifier?.operator ?? "AND",
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
  }));
}
