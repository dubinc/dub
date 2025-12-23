import { HeroBackground } from "@/ui/partners/hero-background";
import { Button, Copy } from "@dub/ui";
import { Suspense } from "react";
import { DynamicHeightMessenger } from "./dynamic-height-messenger";
import { ReferralsEmbedPageClient } from "./page-client";
import { parseThemeOptions, ThemeOptions } from "./theme-options";
import { getReferralsEmbedData } from "./utils";

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
  return (
    <div
      style={{ backgroundColor: themeOptions.backgroundColor || "transparent" }}
      className="flex min-h-screen flex-col"
    >
      <div className="p-5">
        <div className="border-border-default relative flex flex-col overflow-hidden rounded-lg border p-4 md:p-6">
          <HeroBackground color="#737373" />
          <span className="text-base font-semibold text-neutral-800">
            Referral link
          </span>
          <div className="xs:flex-row relative mt-3 flex flex-col items-center gap-2">
            <div className="xs:w-72 border-border-default bg-bg-muted h-10 w-full rounded-md border" />
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
          <div className="bg-bg-default border-border-subtle mt-2 h-20 w-[28rem] rounded-md border" />
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
