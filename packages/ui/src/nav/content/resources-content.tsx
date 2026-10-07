import { cn, createHref } from "@dub/utils";
import { RESOURCES } from "../../content";
import { ProgramMarketplaceSection } from "./program-marketplace";
import {
  ContentLinkCard,
  NAV_UTM_PARAMS,
  contentHeadingClassName,
} from "./shared";

const COLUMNS = [
  {
    heading: "Help and Support",
    titles: ["Docs", "Help Center", "Contact"],
  },
  {
    heading: "Company",
    titles: ["About", "Careers", "Dub Brand"],
  },
  {
    heading: "Updates",
    titles: ["Blog", "Changelog"],
  },
];

export function ResourcesContent({ domain }: { domain: string }) {
  return (
    <div className="w-[1020px] bg-neutral-50 dark:bg-white/[0.03]">
      <div className="relative">
        <div className="grid grid-cols-3 divide-x divide-neutral-200 rounded-b-[20px] bg-white dark:divide-white/20 dark:bg-black">
          {COLUMNS.map(({ heading, titles }) => (
            <div key={heading} className="px-6 py-4">
              <p className={cn(contentHeadingClassName, "mb-2")}>{heading}</p>
              <div className="flex flex-col gap-0.5">
                {RESOURCES.filter(({ title }) => titles.includes(title)).map(
                  ({ icon: Icon, title, description, href }) => (
                    <ContentLinkCard
                      key={href}
                      className="-mx-2"
                      href={createHref(href, domain, {
                        ...NAV_UTM_PARAMS,
                        utm_campaign: domain,
                        utm_content: title,
                      })}
                      icon={
                        <div className="shrink-0 rounded-md border border-neutral-200 bg-white/50 p-2 dark:border-white/20 dark:bg-white/10">
                          <Icon
                            variant="fill"
                            className="size-4 text-neutral-600 transition-colors dark:text-white/60"
                          />
                        </div>
                      }
                      title={title}
                      description={description}
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>

        {/* bottom hairline drawn as a clipped full border, so it keeps full
            strength around the curled corners (border-b alone tapers there);
            kept outside the grid so divide-x doesn't add a border to it */}
        <div className="pointer-events-none absolute -inset-x-px bottom-0 h-5 overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-10 rounded-b-[21px] border border-neutral-200 dark:border-white/20" />
        </div>
      </div>

      <ProgramMarketplaceSection domain={domain} />
    </div>
  );
}
