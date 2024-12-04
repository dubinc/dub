"use client";

import { PartnerSaleResponse } from "@/lib/types";
import { HeroBackground } from "@/ui/partners/hero-background";
import { ProgramCommissionDescription } from "@/ui/partners/program-commission-description";
import {
  Button,
  buttonVariants,
  Check,
  Copy,
  MoneyBill2,
  useCopyToClipboard,
  Wordmark,
} from "@dub/ui";
import { cn, fetcher, getPrettyUrl } from "@dub/utils";
import { Link, Program } from "@prisma/client";
import { CSSProperties } from "react";
import useSWR from "swr";
import { Activity } from "../activity";
import { SalesList } from "../sales-list";
import { LinkToken } from "../token";

type Tab = "invite" | "rewards";

const heroAnimationDuration = 0.2;

export function EmbedInlinePageClient({
  program,
  link,
  earnings,
  hasPartnerProfile,
}: {
  program: Program;
  link: Link;
  earnings: number;
  hasPartnerProfile: boolean;
}) {
  const [copied, copyToClipboard] = useCopyToClipboard();

  const { data: sales, isLoading } = useSWR<PartnerSaleResponse[]>(
    "/api/embed/sales",
    fetcher,
  );

  return (
    <div
      className="flex min-h-screen flex-col"
      style={
        { "--accent-color": program.brandColor || "#171717" } as CSSProperties
      }
    >
      <div className="p-5">
        <div className="relative flex flex-col rounded-lg border border-neutral-300 bg-gradient-to-r from-neutral-50 p-4 md:p-6">
          {program && (
            <HeroBackground
              logo={program?.logo}
              color={program?.brandColor || "#647481"}
            />
          )}
          <span className="flex items-center gap-2 text-sm text-neutral-500">
            <MoneyBill2 className="size-4" />
            Refer and earn
          </span>
          <div className="relative mt-24 text-lg text-neutral-900 sm:max-w-[50%]">
            <ProgramCommissionDescription program={program} />
          </div>
          <span className="mb-1.5 mt-6 block text-sm text-neutral-800">
            Referral link
          </span>
          <div className="xs:flex-row relative flex flex-col items-center gap-2">
            <input
              type="text"
              readOnly
              value={getPrettyUrl(link.shortLink)}
              className="xs:w-auto h-10 w-full rounded-md border border-neutral-300 px-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-gray-500 lg:min-w-64 xl:min-w-72"
            />
            <Button
              icon={
                <div className="relative size-4">
                  <div
                    className={cn(
                      "absolute inset-0 transition-[transform,opacity]",
                      copied && "translate-y-1 opacity-0",
                    )}
                  >
                    <Copy className="size-4" />
                  </div>
                  <div
                    className={cn(
                      "absolute inset-0 transition-[transform,opacity]",
                      !copied && "translate-y-1 opacity-0",
                    )}
                  >
                    <Check className="size-4" />
                  </div>
                </div>
              }
              text={copied ? "Copied link" : "Copy link"}
              className="xs:w-fit"
              onClick={() => copyToClipboard(link.shortLink)}
            />
          </div>
        </div>
        <div className="mt-5">
          <>
            <h2 className="text-sm font-semibold text-neutral-900">Activity</h2>
            <Activity
              clicks={link.clicks}
              leads={link.leads}
              earnings={earnings}
            />
            <div className="mt-4">
              <h2 className="text-sm font-semibold text-neutral-900">
                Recent sales
              </h2>
              <SalesList
                sales={sales}
                isLoading={isLoading}
                hasPartnerProfile={hasPartnerProfile}
              />
              {!isLoading &&
                sales &&
                sales.length > 0 &&
                (hasPartnerProfile ? (
                  <a
                    href="https://partners.dub.co/settings/payouts"
                    target="_blank"
                    className={cn(
                      buttonVariants({ variant: "primary" }),
                      "mt-3 flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
                    )}
                  >
                    Withdraw earnings
                  </a>
                ) : (
                  <a
                    href="https://partners.dub.co/register"
                    target="_blank"
                    className={cn(
                      buttonVariants({ variant: "primary" }),
                      "mt-3 flex h-10 items-center justify-center whitespace-nowrap rounded-lg border px-4 text-sm",
                    )}
                  >
                    Create partner account
                  </a>
                ))}
            </div>
          </>
          <LinkToken />
        </div>
      </div>
      <div className="flex grow flex-col justify-end">
        <div className="flex items-center justify-center">
          <a
            href="https://d.to/conversions"
            target="_blank"
            className="flex items-center justify-center gap-1 rounded-lg bg-white p-2 pb-2.5 transition-colors"
          >
            <p className="text-sm text-neutral-500">Powered by</p>
            <Wordmark className="h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
