"use client";

import { ExampleFraudEvents } from "./example-fraud-events";

export function FraudEventsEmptyState() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
      <ExampleFraudEvents />
      <div className="max-w-sm text-pretty text-center">
        <span className="text-base font-semibold text-neutral-700">
          No events to review
        </span>
        <p className="mt-2 text-sm font-medium text-neutral-500">
          You'll see flagged fraud and risk events here when they happen.{" "}
          <a
            href="https://dub.co/help/article/fraud-detection"
            target="_blank"
            rel="noopener noreferrer"
            className="text-content-default hover:text-content-emphasis cursor-alias underline decoration-dotted underline-offset-2"
          >
            Learn more.
          </a>
        </p>
      </div>
    </div>
  );
}
