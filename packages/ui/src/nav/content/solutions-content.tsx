import { cn, createHref } from "@dub/utils";
import { PROFILES } from "../../content";
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
    </div>
  );
}
