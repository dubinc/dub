import { cn, createHref } from "@dub/utils";
import { COMPANY, SOCIAL_LINKS } from "../../content";
import {
  contentHeadingClassName,
  ContentLinkCard,
  getUtmParams,
  LargeLinkCard,
} from "./shared";

export function CompanyContent({ domain }: { domain: string }) {
  return (
    <div className="grid w-[540px] grid-cols-[minmax(0,1fr),minmax(0,0.75fr)] divide-x divide-neutral-200">
      <div className="flex flex-col gap-4 p-4">
        {COMPANY.map(({ title, description, icon, href }) => (
          <LargeLinkCard
            key={title}
            title={title}
            description={description}
            icon={icon}
            iconClassName="size-5"
            href={createHref(
              href,
              domain,
              getUtmParams({ domain, utm_content: title }),
            )}
          />
        ))}
      </div>
      <div className="px-6 py-4">
        <p className={cn(contentHeadingClassName, "mb-2")}>Social</p>
        <div className="grid grid-cols-1">
          {SOCIAL_LINKS.map(({ icon: Icon, name, href }) => (
            <ContentLinkCard
              key={href}
              href={href}
              target="_blank"
              className="-mx-2"
              icon={
                <div className="shrink-0 rounded-lg border border-neutral-200 bg-white/50 p-1.5 dark:border-white/20 dark:bg-white/10">
                  <Icon className="size-4 shrink-0 text-neutral-600 transition-colors dark:text-white/60" />
                </div>
              }
              title={name}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
