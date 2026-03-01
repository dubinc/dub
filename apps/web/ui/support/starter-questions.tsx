"use client";

import { cn } from "@dub/utils";
import { SupportChatContext } from "./types";

const STARTER_QUESTIONS: Record<SupportChatContext, string[]> = {
  app: [
    "How do I set up custom domains?",
    "How does link click tracking work?",
    "How do I view my analytics?",
    "How do I use the Dub API?",
    "How do I manage my workspace team?",
    "How do I update my billing information?",
  ],
  partners: [
    "How do I set up my bank account for payouts?",
    "Which countries support payouts?",
    "How is my commission calculated?",
    "When will I receive my payout?",
    "How do I track my referral clicks?",
    "How do I update my partner profile?",
  ],
  docs: [
    "How do I install the Dub SDK?",
    "How do webhooks work?",
    "How do I track conversions?",
    "What are the API rate limits?",
    "How do I authenticate with the API?",
    "How do I shorten links programmatically?",
  ],
};

export function StarterQuestions({
  context,
  onSelect,
  className,
}: {
  context: SupportChatContext;
  onSelect: (question: string) => void;
  className?: string;
}) {
  const questions = STARTER_QUESTIONS[context] ?? STARTER_QUESTIONS.app;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {questions.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-800"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
