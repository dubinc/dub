import { Button, Copy, MoneyBill, Wordmark } from "@dub/ui";
import { HeroBackground } from "./hero-background";

export default function EmbedInlineLoading() {
  const tabs = ["Quickstart", "Sales", "Leaderboard", "FAQ"];
  return (
    <div className="flex min-h-screen flex-col">
      <div className="p-5">
        <div className="relative flex flex-col overflow-hidden rounded-lg border border-neutral-300 p-4 md:p-6">
          <HeroBackground />
          <span className="flex items-center gap-2 text-sm text-neutral-500">
            <MoneyBill className="size-4" />
            Refer and earn
          </span>
          <div className="relative mt-16 flex flex-col gap-2">
            <div className="h-6 w-60 rounded-md bg-neutral-50" />
            <div className="h-6 w-40 rounded-md bg-neutral-50" />
          </div>
          <span className="mb-1.5 mt-6 block text-sm text-neutral-800">
            Referral link
          </span>
          <div className="xs:flex-row relative flex flex-col items-center gap-2">
            <div className="xs:w-60 h-10 w-full rounded-md border border-neutral-300 bg-neutral-50" />
            <Button
              icon={<Copy className="size-4" />}
              text="Copy link"
              className="xs:w-fit"
              disabled
            />
          </div>
          <a
            href="https://dub.partners"
            target="_blank"
            className="mt-4 flex items-center justify-center gap-1.5 text-neutral-500 transition-colors duration-75 hover:text-neutral-700 md:absolute md:bottom-3 md:right-3 md:mt-0 md:translate-x-0"
          >
            <p className="text-xs font-medium">Powered by</p>
            <Wordmark className="h-3.5 text-neutral-900" />
          </a>
        </div>
        <div className="mt-4 grid gap-2 sm:h-32 sm:grid-cols-3">
          <div className="h-full w-full rounded-lg border border-neutral-200 bg-neutral-50 sm:col-span-2" />
          <div className="h-full w-full rounded-lg border border-neutral-200 bg-neutral-50" />
        </div>
        <div className="mt-4">
          <div className="h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50" />
          <div className="my-4 h-80 w-full rounded-lg border border-neutral-100 p-2" />
        </div>
      </div>
    </div>
  );
}
