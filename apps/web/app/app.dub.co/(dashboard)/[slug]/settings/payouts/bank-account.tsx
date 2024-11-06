"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { StatusBadge, Tooltip } from "@dub/ui";
import { Fragment } from "react";

export const BankAccount = () => {
  const { bankAccountVerified, partialAccountNumber, routingNumber, slug } =
    useWorkspace();

  return (
    <>
      <div className="flex flex-col p-4">
        <div className="flex justify-between gap-5">
          <div className="p-1">
            <div className="text-sm text-neutral-500">Bank account</div>
          </div>
          {bankAccountVerified !== undefined ? (
            <div>
              {bankAccountVerified ? (
                <VerificationBadge verified={true} />
              ) : (
                <Tooltip
                  align="end"
                  content={
                    <div className="px-3 py-2 text-sm text-neutral-600">
                      To complete verification,{" "}
                      <a
                        href={
                          `mailto:support@dub.co?subject=Verifying payouts bank account` +
                          `&body=I am verifying bank account ownership for my workspace "${slug}".` +
                          ` I have attached a copy of my recent bank statement to this email.`
                        }
                        className="underline transition-colors duration-75 hover:text-neutral-900"
                      >
                        contact support
                      </a>{" "}
                    </div>
                  }
                >
                  <div>
                    <VerificationBadge verified={!!bankAccountVerified} />
                  </div>
                </Tooltip>
              )}
            </div>
          ) : (
            <div className="h-6 w-16 animate-pulse rounded bg-neutral-200" />
          )}
        </div>
        <div className="mt-12 flex grow flex-col justify-end p-1">
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-4 gap-y-1">
            {[
              ["Routing number", routingNumber],
              ["Account number", partialAccountNumber?.padStart(10, "•")],
            ].map(([label, value]) => (
              <Fragment key={label}>
                <div className="truncate text-base font-medium text-neutral-900">
                  {label}
                </div>
                <div className="flex justify-end text-right font-mono text-neutral-500">
                  {value !== undefined ? (
                    <span>{value}</span>
                  ) : (
                    <div className="h-6 w-24 animate-pulse rounded bg-neutral-200" />
                  )}
                </div>
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

function VerificationBadge({ verified }: { verified: boolean }) {
  return (
    <StatusBadge variant={verified ? "success" : "neutral"} icon={null}>
      {verified ? "Verified" : "Verifying"}
    </StatusBadge>
  );
}
