"use client";

import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramPayoutMode } from "@dub/prisma/client";
import { Webhook } from "@dub/ui";
import Link from "next/link";

export function ProgramPayoutModeSection() {
  const { program } = useProgram();

  const payoutModeOptions = [
    {
      value: ProgramPayoutMode.hybrid,
      label: "Dub and external (Hybrid)",
      description: (
        <>
          Partners with connected bank accounts are paid directly by Dub. All
          other partners with tenant IDs configured receive payouts via the{" "}
          <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
            payout.confirmed
          </code>{" "}
          webhook event.
        </>
      ),
    },
    {
      value: ProgramPayoutMode.external,
      label: "External only",
      description: (
        <>
          All payouts are processed through the{" "}
          <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
            payout.confirmed
          </code>{" "}
          webhook event to your platform.
        </>
      ),
    },
  ];

  const currentPayoutMode = program?.payoutMode ?? ProgramPayoutMode.internal;
  const selectedOption = payoutModeOptions.find(
    (option) => option.value === currentPayoutMode,
  );

  if (!selectedOption) {
    return null;
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-content-emphasis text-sm font-medium">
            Payout mode: {selectedOption.label}
          </span>
        </div>

        <p className="text-content-subtle text-sm leading-5">
          {selectedOption.description}
        </p>

        <WebhookInfo />
      </div>
    </div>
  );
}

function WebhookInfo() {
  const { slug } = useWorkspace();

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50 p-2.5">
      <Webhook className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
      <p className="text-content-subtle text-xs leading-4">
        Ensure webhooks are configured to listen for the{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs text-amber-900">
          payout.confirmed
        </code>{" "}
        event.{" "}
        <Link
          href={`/${slug}/settings/webhooks`}
          className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-800"
        >
          Manage webhooks
        </Link>
      </p>
    </div>
  );
}
