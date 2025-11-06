"use client";

import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { ProgramPayoutMode } from "@dub/prisma/client";
import Link from "next/link";

export function ProgramPayoutModeSection() {
  const { program } = useProgram();

  const payoutModeOptions = [
    {
      value: ProgramPayoutMode.hybrid,
      label: "Dub and external (Hybrid)",
      description: (
        <>
          Partners that have connected their bank accounts are paid via Dub,
          others that have tenant ID configured are paid via the{" "}
          <span className="rounded-md bg-neutral-100 px-1 py-0.5 font-mono">
            payout.confirmed
          </span>{" "}
          webhook event.{" "}
          <a
            href="https://dub.co/help/article/partner-payouts#payout-fees-and-timing"
            target="_blank"
            className="underline"
          >
            Payout fees still apply.
          </a>
        </>
      ),
    },
    {
      value: ProgramPayoutMode.external,
      label: "External only",
      description: (
        <>
          All eligible payouts are processed through the{" "}
          <span className="rounded-md bg-neutral-100 px-1 py-0.5 font-mono">
            payout.confirmed
          </span>{" "}
          webhook event.{" "}
          <a
            href="https://dub.co/help/article/partner-payouts#payout-fees-and-timing"
            target="_blank"
            className="underline"
          >
            Payout fees still apply.
          </a>
        </>
      ),
    },
  ];

  const currentPayoutMode = program?.payoutMode ?? ProgramPayoutMode.internal;
  const selectedOption =
    payoutModeOptions.find((option) => option.value === currentPayoutMode) ||
    payoutModeOptions[0];

  return (
    <div className="space-2.5 rounded-lg border border-neutral-200 bg-white p-3">
      <div className="text-content-emphasis text-sm font-medium">
        Payout mode: {selectedOption.label}
      </div>
      <p className="text-content-subtle mt-0.5 text-xs font-normal leading-4">
        {selectedOption.description}
      </p>
      <WebhookWarning />
    </div>
  );
}

function WebhookWarning() {
  const { slug } = useWorkspace();

  return (
    <div className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-2 py-1.5">
      <p className="text-xs leading-4 text-amber-700">
        Ensure your webhooks are configured to listen to{" "}
        <strong className="rounded-md bg-amber-200 px-1 py-0.5 font-mono text-amber-800">
          payout.confirmed
        </strong>{" "}
        event on platform side.{" "}
        <Link
          href={`/${slug}/settings/webhooks`}
          className="font-normal underline"
          target="_blank"
        >
          Manage webhooks
        </Link>
      </p>
    </div>
  );
}
