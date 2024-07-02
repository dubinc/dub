import { COMPARE_PAGES, cn } from "@dub/utils";
import va from "@vercel/analytics";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { CUSTOMER_STORIES, FEATURES_LIST } from "../../content";
import { ContentProps, createHref } from "../shared";
import {
  ContentIcon,
  ContentLinkCard,
  contentHeadingClassName,
} from "./shared";

export function ProductContent({ domain }: ContentProps) {
  return (
    <div className="grid w-[40rem] grid-cols-2">
      <div className="p-5">
        <p className={cn(contentHeadingClassName, "mb-2")}>Features</p>
        <div className="-mx-2 -mb-2 grid grid-cols-1 gap-0.5">
          {FEATURES_LIST.map(({ slug, icon, title, shortTitle }) => (
            <ContentLinkCard
              key={slug}
              href={createHref(`/${slug}`, domain)}
              {...(domain !== "dub.co" && {
                onClick: () => {
                  va.track("Referred from custom domain", {
                    domain,
                    medium: `navbar item (/${slug})`,
                  });
                },
              })}
              icon={<ContentIcon icon={icon} />}
              title={shortTitle}
              description={title}
            />
          ))}
        </div>
      </div>
      <div className="border-l border-gray-200 p-5">
        <Link
          href={createHref("/blog/category/customers", domain)}
          className={cn(
            contentHeadingClassName,
            "group mb-2 flex items-center transition-colors hover:text-black",
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
                href={createHref(href, domain)}
                className="-mx-2"
                icon={
                  <Icon
                    className={cn(
                      "h-7 w-7 shrink-0 text-gray-600 transition-colors",
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
              href={createHref(`/compare/${slug}`, domain)}
              className="block text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
            >
              Dub vs. {name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
