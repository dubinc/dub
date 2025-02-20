"use client";

import usePartnerLinks from "@/lib/swr/use-partner-links";
import { CardList, CopyButton, LinkLogo } from "@dub/ui";
import { ArrowTurnRight2, CursorRays } from "@dub/ui/icons";
import { getApexDomain, getPrettyUrl, nFormatter } from "@dub/utils";
import Link from "next/link";

const LOGO_SIZE_CLASS_NAME = "size-4 sm:size-6";

export function ProgramLinksPageClient() {
  const { links, error, loading } = usePartnerLinks();

  return (
    <CardList>
      {loading
        ? [...Array(3)].map((_, i) => (
            <CardList.Card
              key={i}
              innerClassName="flex items-center justify-between gap-4 h-[66px]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative hidden size-8 shrink-0 animate-pulse rounded-full bg-neutral-200 sm:flex" />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="h-5 w-32 animate-pulse rounded-md bg-neutral-200" />
                  <div className="h-4 w-48 animate-pulse rounded-md bg-neutral-200" />
                </div>
              </div>
              <div className="h-7 w-16 animate-pulse rounded-md bg-neutral-200" />
            </CardList.Card>
          ))
        : links?.map((link) => (
            <CardList.Card
              key={link.id}
              innerClassName="flex items-center justify-between gap-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative hidden shrink-0 items-center justify-center sm:flex">
                  <div className="absolute inset-0 shrink-0 rounded-full border border-neutral-200">
                    <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
                  </div>
                  <div className="relative p-2.5">
                    <LinkLogo
                      apexDomain={getApexDomain(link.url)}
                      className={LOGO_SIZE_CLASS_NAME}
                    />
                  </div>
                </div>

                <div className="flex min-w-0 flex-col">
                  <div className="flex items-center gap-2">
                    <a
                      href={link.shortLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-semibold leading-6 text-neutral-700 transition-colors hover:text-black"
                    >
                      {getPrettyUrl(link.shortLink)}
                    </a>
                    <CopyButton
                      value={link.shortLink}
                      variant="neutral"
                      className="p-1.5"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-neutral-500 transition-colors hover:text-neutral-700"
                    >
                      {getPrettyUrl(link.url)}
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="#"
                  className="flex items-center gap-1 overflow-hidden rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-sm text-neutral-600 transition-colors hover:bg-white"
                >
                  <CursorRays className="h-4 w-4 text-neutral-600" />
                  <span>{nFormatter(link.clicks)}</span>
                </Link>
              </div>
            </CardList.Card>
          ))}
    </CardList>
  );
}
