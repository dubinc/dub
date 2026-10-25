"use client";

import { cn } from "@dub/utils";
import { SupportChatContext } from "./types";

const STARTER_QUESTIONS: Record<SupportChatContext, string[]> = {
  app: [
    "How do I set up custom domain?",
    "How do I set up conversion tracking?",
    "How does attribution work?",
    "How do I use the Dub API?",
    "How do I update my billing information?",
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
