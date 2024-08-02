import { cn, createHref } from "@dub/utils";
import { PROFILES, SDKS } from "../../content";
import {
  ContentIcon,
  ContentLinkCard,
  contentHeadingClassName,
} from "./shared";

export function SolutionsContent({ domain }: { domain: string }) {
  return (
    <div className="grid w-[32rem] grid-cols-[5fr_3.5fr]">
      <div className="p-5">
        <p className={cn(contentHeadingClassName, "mb-2")}>Profiles</p>
        <div className="-mx-2 flex flex-col gap-0.5">
          {PROFILES.map(({ icon, title, description, href }) => (
            <ContentLinkCard
              href={createHref(href, domain, {
                utm_source: "Custom Domain",
                utm_medium: "Navbar",
                utm_campaign: domain,
                utm_content: title,
              })}
              icon={<ContentIcon icon={icon} />}
              title={title}
              description={description}
            />
          ))}
        </div>
      </div>
      <div className="border-l border-gray-200 p-5 dark:border-white/20">
        <p className={cn(contentHeadingClassName, "mb-2")}>SDKs</p>
        <div className="-mx-2 flex flex-col gap-0.5">
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
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 text-gray-600 transition-colors dark:text-white/60",
                    iconClassName,
                  )}
                />
              }
              title={title}
              showArrow
            />
          ))}
        </div>
      </div>
    </div>
  );
}
