import { HeroBackground } from "@/ui/partners/hero-background";
import { Button, Copy, Wordmark } from "@dub/ui";
import { Suspense } from "react";
import { ReferralsEmbedPageClient } from "./page-client";
import { parseThemeOptions, ThemeOptions } from "./theme-options";
import { getReferralsEmbedData } from "./utils";

export default function ReferralsEmbedPage({
  searchParams,
}: {
  searchParams: { token: string; themeOptions?: string };
}) {
  const { token, themeOptions: themeOptionsRaw } = searchParams;

  const themeOptions = parseThemeOptions(themeOptionsRaw);

  return (
    <Suspense fallback={<EmbedInlineLoading themeOptions={themeOptions} />}>
      <ReferralsEmbedRSC token={token} themeOptions={themeOptions} />
    </Suspense>
  );
}

async function ReferralsEmbedRSC({
  token,
  themeOptions,
}: {
  token: string;
  themeOptions: ThemeOptions;
}) {
  const embedData = await getReferralsEmbedData(token);

  return (
    <ReferralsEmbedPageClient {...embedData} themeOptions={themeOptions} />
  );
}

function EmbedInlineLoading({ themeOptions }: { themeOptions: ThemeOptions }) {
  return (
    <div
      style={
        themeOptions.backgroundColor
          ? { backgroundColor: themeOptions.backgroundColor }
          : undefined
      }
      className="bg-bg-default flex min-h-screen flex-col"
    >
      <div className="p-5">
        <div className="border-border-default relative flex flex-col overflow-hidden rounded-lg border p-4 md:p-6">
          <HeroBackground color="#737373" />
          <span className="text-base font-semibold text-neutral-800">
            Referral link
          </span>
          <div className="xs:flex-row relative mt-3 flex flex-col items-center gap-2">
            <div className="xs:w-60 border-border-default bg-bg-muted h-10 w-full rounded-md border" />
            <Button
              icon={<Copy className="size-4" />}
              text="Copy link"
              className="xs:w-fit"
              disabled
            />
          </div>
          <span className="mt-12 text-base font-semibold text-neutral-800">
            Rewards
          </span>
          <div className="relative mt-2 flex flex-col gap-2">
            <div className="bg-bg-muted h-6 w-60 rounded-md" />
            <div className="bg-bg-muted h-6 w-40 rounded-md" />
          </div>
          <a
            href="https://dub.partners"
            target="_blank"
            className="hover:text-content-default text-content-subtle mt-4 flex items-center justify-center gap-1.5 transition-colors duration-75 md:absolute md:bottom-3 md:right-3 md:mt-0 md:translate-x-0"
          >
            <p className="text-xs font-medium">Powered by</p>
            <Wordmark className="text-content-emphasis h-3.5" />
          </a>
        </div>
        <div className="mt-4 grid gap-2 sm:h-32 sm:grid-cols-3">
          <div className="border-border-subtle bg-bg-muted h-full w-full rounded-lg border sm:col-span-2" />
          <div className="border-border-subtle bg-bg-muted h-full w-full rounded-lg border" />
        </div>
        <div className="mt-4">
          <div className="border-border-subtle bg-bg-muted h-10 w-full rounded-lg border" />
          <div className="border-border-muted my-4 h-80 w-full rounded-lg border p-2" />
        </div>
      </div>
    </div>
  );
}
