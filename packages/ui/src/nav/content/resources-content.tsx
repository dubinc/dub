import { cn, createHref } from "@dub/utils";
import Link from "next/link";
import { RESOURCES, SDKS } from "../../content";
import { Grid } from "../../grid";
import { HexadecagonStar } from "../../icons";
import {
  ContentLinkCard,
  LargeLinkCard,
  contentHeadingClassName,
} from "./shared";

export function ResourcesContent({ domain }: { domain: string }) {
  return (
    <div className="grid w-[584px] grid-cols-2 gap-4 p-5">
      <div>
        <div className="flex flex-col gap-4">
          {RESOURCES.map(({ icon, title, description, href }) => (
            <LargeLinkCard
              key={title}
              title={title}
              description={description}
              icon={icon}
              href={createHref(href, domain)}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <p className={cn(contentHeadingClassName, "my-2")}>SDKs</p>
          <div className="flex flex-col gap-0.5">
            {SDKS.map(({ icon: Icon, iconClassName, title, href }) => (
              <ContentLinkCard
                key={href}
                href={createHref(href, domain, {
                  utm_source: "Custom Domain",
                  utm_medium: "Navbar",
                  utm_campaign: domain,
                  utm_content: title,
                })}
                icon={
                  <div className="shrink-0 rounded-[10px] border border-gray-200 bg-white/50 p-1 dark:border-white/20 dark:bg-white/10">
                    <Icon
                      className={cn(
                        "size-5 text-gray-600 transition-colors dark:text-white/60",
                        iconClassName,
                      )}
                    />
                  </div>
                }
                title={title}
                showArrow
              />
            ))}
          </div>
        </div>
        <div className="flex grow flex-col justify-end">
          <Link
            href={createHref("/brand", domain)}
            className="group relative flex flex-col overflow-hidden rounded-xl bg-black transition-colors duration-75 dark:border dark:border-white/20"
          >
            <Grid
              cellSize={20}
              patternOffset={[0, -5]}
              className="text-neutral-600 [mask-image:radial-gradient(75%_50%_at_50%_0,black,transparent)]"
            />
            <div className="pointer-events-none absolute -inset-[50%] opacity-30 blur-[20px] transition-opacity duration-300 group-hover:opacity-40 dark:group-hover:opacity-35">
              <div
                className={cn(
                  "absolute inset-[16%] rounded-xl",
                  "bg-[radial-gradient(20%_80%_at_50%_100%,#fd3a4e,transparent),radial-gradient(30%_80%_at_40%_50%,#855afc,transparent),radial-gradient(30%_80%_at_60%_50%,#72fe7d,transparent),radial-gradient(30%_100%_at_50%_50%,#e4c795,transparent)]",
                )}
              />
            </div>
            <div className="relative flex items-center justify-between px-5 py-4">
              <div>
                <span className="text-sm font-medium leading-none text-white">
                  Dub Brand
                </span>
                <p className="mt-1 text-sm text-white/70">
                  Logos, wordmark, etc.
                </p>
              </div>
              <HexadecagonStar className="size-6 text-white" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
