import { HeroBackground } from "@/ui/partners/hero-background";
import { Button, Copy } from "@dub/ui";
import { Suspense } from "react";
import { DynamicHeightMessenger } from "./dynamic-height-messenger";
import { getReferralsEmbedData } from "./get-referrals-embed-data";
import { ReferralsEmbedPageClient } from "./page-client";
import { parseThemeOptions, ThemeOptions } from "./theme-options";

export default async function ReferralsEmbedPage(props: {
  searchParams: Promise<{
    token: string;
    themeOptions?: string;
    dynamicHeight?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const {
    token,
    themeOptions: themeOptionsRaw,
    dynamicHeight: dynamicHeightRaw,
  } = searchParams;

  const themeOptions = parseThemeOptions(themeOptionsRaw);
  const dynamicHeight = !!dynamicHeightRaw && dynamicHeightRaw !== "false";

  return (
    <>
      <Suspense fallback={<EmbedInlineLoading themeOptions={themeOptions} />}>
        <ReferralsEmbedRSC
          token={token}
          themeOptions={themeOptions}
          dynamicHeight={dynamicHeight}
        />
      </Suspense>
      {dynamicHeight && <DynamicHeightMessenger />}
    </>
  );
}

async function ReferralsEmbedRSC({
  token,
  themeOptions,
  dynamicHeight,
}: {
  token: string;
  themeOptions: ThemeOptions;
  dynamicHeight: boolean;
}) {
  const embedData = await getReferralsEmbedData(token);

  return (
    <ReferralsEmbedPageClient
      {...embedData}
      themeOptions={themeOptions}
      dynamicHeight={dynamicHeight}
    />
  );
}

function EmbedInlineLoading({ themeOptions }: { themeOptions: ThemeOptions }) {
  const backgroundColor = themeOptions.backgroundColor || "transparent";
  return (
    <div style={{ backgroundColor }} className="flex min-h-screen flex-col">
      <div className="p-5">
        <div className="border-border-default relative flex flex-col overflow-hidden rounded-lg border p-4 md:p-6">
          <HeroBackground color="#737373" />
          <span className="text-content-emphasis text-base font-semibold">
            Referral link
          </span>
          <div className="xs:flex-row relative mt-3 flex flex-col items-center gap-2">
            <div
              style={{ backgroundColor }}
              className="xs:w-72 border-border-default h-10 w-full rounded-md border opacity-70"
            />
            <Button
              icon={<Copy className="size-4" />}
              text="Copy link"
              className="xs:w-fit"
              disabled
            />
          </div>
          <span className="text-content-emphasis mt-12 text-base font-semibold">
            Rewards
          </span>
          <div
            style={{ backgroundColor }}
            className="border-border-subtle mt-2 h-20 w-[28rem] animate-pulse rounded-md border opacity-70"
          />
        </div>
        <div className="mt-4 grid gap-2 sm:h-32 sm:grid-cols-3">
          <div
            style={{ backgroundColor }}
            className="border-border-subtle h-full w-full rounded-lg border opacity-70 sm:col-span-2"
          />
          <div
            style={{ backgroundColor }}
            className="border-border-subtle h-full w-full rounded-lg border opacity-70"
          />
        </div>
        <div className="mt-4">
          <div
            style={{ backgroundColor }}
            className="border-border-subtle h-10 w-full rounded-lg border opacity-70"
          />
          <div
            style={{ backgroundColor }}
            className="border-border-muted my-4 h-80 w-full rounded-lg border p-2 opacity-70"
          />
        </div>
      </div>
    </div>
  );
}
