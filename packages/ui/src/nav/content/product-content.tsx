import { cn, createHref } from "@dub/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { COMPARE_PAGES, CUSTOMER_STORIES, FEATURES_LIST } from "../../content";
import { ExpandingArrow } from "../../icons";
import {
  ContentIcon,
  ContentLinkCard,
  contentHeadingClassName,
} from "./shared";

export function ProductContent({ domain }: { domain: string }) {
  return (
    <div className="grid w-[40rem] grid-cols-2">
      <div className="p-5">
        <p className={cn(contentHeadingClassName, "mb-2")}>Features</p>
        <div className="-mx-2 -mb-2 grid grid-cols-1 gap-0.5">
          {FEATURES_LIST.map(({ icon, title, description, href }) => (
            <ContentLinkCard
              key={href}
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
        <Link
          href={createHref("/customers", domain, {
            utm_source: "Custom Domain",
            utm_medium: "Navbar",
            utm_campaign: domain,
            utm_content: "Customer Stories",
          })}
          className={cn(
            contentHeadingClassName,
            "group mb-2 flex items-center transition-colors hover:text-black dark:hover:text-white",
          )}
        >
          Customer Stories
          <ChevronRight className="ml-0.5 h-2.5 w-2.5 transition-transform group-hover:translate-x-px" />
        </Link>
        <div className="grid grid-cols-1">
          {CUSTOMER_STORIES.map(
            ({ icon: Icon, iconClassName, title, description, href }) => (
              <ContentLinkCard
                key={href}
                href={createHref(href, domain, {
                  utm_source: "Custom Domain",
                  utm_medium: "Navbar",
                  utm_campaign: domain,
                  utm_content: title,
                })}
                className="-mx-2"
                icon={
                  <Icon
                    className={cn(
                      "h-7 w-7 shrink-0 text-gray-600 transition-colors dark:text-white/60",
                      iconClassName,
                    )}
                  />
                }
                title={title}
                description={description}
                descriptionLines={2}
              />
            ),
          )}
        </div>

        <p className={cn(contentHeadingClassName, "my-4")}>Compare</p>
        <div className="flex flex-col gap-1.5">
          {COMPARE_PAGES.map(({ name, slug }) => (
            <Link
              key={slug}
              href={createHref(`/compare/${slug}`, domain, {
                utm_source: "Custom Domain",
                utm_medium: "Navbar",
                utm_campaign: domain,
                utm_content: `Dub vs. ${name}`,
              })}
              className="group flex items-center gap-0.5 text-gray-500 transition-colors hover:text-gray-700 dark:text-white/60 dark:hover:text-white/80"
            >
              <p className="text-sm font-medium">Dub vs. {name}</p>{" "}
              <ExpandingArrow className="h-3 w-3" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
