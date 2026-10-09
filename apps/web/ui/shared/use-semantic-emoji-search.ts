"use client";

import type { EmojiMatch } from "@/lib/ai/search-emojis";
import { useEffect, useState } from "react";

export const DUB_EMOJI_MATCHES: EmojiMatch[] = [
  { emoji: "🤝", label: "Partners" },
  { emoji: "💰", label: "Money" },
  { emoji: "💸", label: "Payout" },
  { emoji: "🔗", label: "Link" },
  { emoji: "📱", label: "Mobile" },
  { emoji: "🚀", label: "Growth" },
  { emoji: "📊", label: "Analytics" },
  { emoji: "🎯", label: "Conversion" },
  { emoji: "🌐", label: "Domain" },
  { emoji: "📈", label: "Clicks" },
  { emoji: "🏷️", label: "Tag" },
  { emoji: "👥", label: "Customers" },
  { emoji: "💬", label: "Messages" },
  { emoji: "🎁", label: "Reward" },
  { emoji: "🏆", label: "Bounty" },
  { emoji: "🔔", label: "Webhook" },
];

const emojiSearchCache = new Map<string, EmojiMatch[]>();
const emojiSearchRequests = new Map<string, Promise<EmojiMatch[]>>();

export function normalizeEmojiQuery(query: string) {
  return query.trim().toLowerCase();
}

function fetchEmojiMatches(query: string) {
  const cached = emojiSearchCache.get(query);
  if (cached) return Promise.resolve(cached);

  const pending = emojiSearchRequests.get(query);
  if (pending) return pending;

  const request = fetch("/api/ai/emoji-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Emoji search failed");
      }

      const data = (await response.json()) as { emojis?: EmojiMatch[] };
      const matches = Array.isArray(data.emojis)
        ? data.emojis.filter(
            (match) =>
              !!match &&
              typeof match.emoji === "string" &&
              typeof match.label === "string",
          )
        : [];

      emojiSearchCache.set(query, matches);
      return matches;
    })
    .finally(() => {
      emojiSearchRequests.delete(query);
    });

  emojiSearchRequests.set(query, request);
  return request;
}

export function useSemanticEmojiSearch(query: string, enabled: boolean) {
  const normalized = normalizeEmojiQuery(query);
  const [result, setResult] = useState<{
    query: string;
    matches: EmojiMatch[];
  } | null>(null);
  const [failedQuery, setFailedQuery] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || normalized.length < 2 || emojiSearchCache.has(normalized)) {
      return;
    }

    let active = true;
    const timeout = window.setTimeout(() => {
      fetchEmojiMatches(normalized)
        .then((matches) => {
          if (!active) return;
          setFailedQuery((current) =>
            current === normalized ? null : current,
          );
          setResult({ query: normalized, matches });
        })
        .catch(() => {
          if (!active) return;
          setFailedQuery(normalized);
        });
    }, 120);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [enabled, normalized]);

  if (!enabled || normalized.length < 2) {
    return { status: "idle" as const, matches: [] as EmojiMatch[] };
  }

  const matches =
    emojiSearchCache.get(normalized) ??
    (result?.query === normalized ? result.matches : undefined);

  if (!matches) {
    if (failedQuery === normalized) {
      return { status: "empty" as const, matches: [] as EmojiMatch[] };
    }

    return { status: "loading" as const, matches: [] as EmojiMatch[] };
  }

  if (matches.length === 0) {
    return { status: "empty" as const, matches };
  }

  return { status: "ready" as const, matches };
}
