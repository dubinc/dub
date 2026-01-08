"use client";

import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramPayoutMode } from "@dub/prisma/client";
import { CircleDollarOut, Webhook } from "@dub/ui";
import Link from "next/link";

export function ProgramPayoutModeSection() {
  const { program } = useProgram();

  const payoutModeOptions = [
    {
      value: ProgramPayoutMode.hybrid,
      label: "Dub and external (Hybrid)",
      description:
        "Partners with connected bank accounts are paid directly by Dub. Those linked by tenant ID receive payouts externally through the webhook.",
    },
    {
      value: ProgramPayoutMode.external,
      label: "External only",
      description:
        "Every payout is processed externally through your platform's webhook integration. Dub does not handle any direct transfers.",
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
    <div className="space-y-3">
      <h4 className="text-base font-semibold leading-6 text-neutral-900">
        Payout method
      </h4>
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="flex items-center gap-3 border-b border-neutral-200 p-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
            <CircleDollarOut className="text-content-emphasis size-4" />
          </div>
          <h3 className="text-content-emphasis text-sm font-semibold leading-4">
            {selectedOption.label}
          </h3>
          <a
            href="http://dub.co/docs/partners/external-payouts"
            target="_blank"
            className="text-content-subtle rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium transition-colors hover:bg-neutral-200/75"
          >
            Learn more ↗
          </a>
        </div>

        <div className="space-y-4 p-3">
          <p className="text-content-subtle text-xs font-medium leading-4">
            {selectedOption.description}
          </p>
          <WebhookInfo />
        </div>
      </div>
    </div>
  );
}

function WebhookInfo() {
  const { slug } = useWorkspace();

  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50 p-2.5">
      <Webhook className="mt-0.5 size-3.5 shrink-0 text-amber-600" />
      <p className="text-xs font-medium leading-4 text-amber-900">
        Ensure webhooks are configured to listen for the{" "}
        <code className="rounded bg-amber-200 px-1 py-0.5 font-mono text-xs text-amber-900">
          payout.confirmed
        </code>{" "}
        event.{" "}
        <Link
          href={`/${slug}/settings/webhooks`}
          target="_blank"
          className="font-medium underline underline-offset-2 hover:text-amber-800"
        >
          Manage webhooks
        </Link>
      </p>
    </div>
  );
}
