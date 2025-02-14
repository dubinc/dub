import { cn, createHref } from "@dub/utils";
import { Link as NavigationMenuLink } from "@radix-ui/react-navigation-menu";
import Link from "next/link";
import { COMPARE_PAGES, CUSTOMER_STORIES } from "../../content";
import { ConnectedDotsFill, CubeSettingsFill } from "../../icons";
import { AnalyticsGraphic } from "./graphics/analytics-graphic";
import { LinksGraphic } from "./graphics/links-graphic";
import {
  ContentLinkCard,
  LargeLinkCard,
  contentHeadingClassName,
  getUtmParams,
} from "./shared";

const largeLinks = [
  {
    title: "Dub API",
    description: "Programmatic link creation at scale",
    icon: CubeSettingsFill,
    href: "/docs/api-reference/introduction",
  },
  {
    title: "Dub Integrations",
    description: "Connect Dub with your favorite tools",
    icon: ConnectedDotsFill,
    href: "/docs/integrations",
  },
];

export function ProductContent({ domain }: { domain: string }) {
  return (
    <div className="grid w-[1020px] grid-cols-[minmax(0,1fr),0.4fr] divide-x divide-neutral-200">
      <div className="grid grid-cols-2 gap-4 p-4">
        <NavigationMenuLink asChild>
          <Link
            href={createHref(
              "/home",
              domain,
              getUtmParams({ domain, utm_content: "Dub Links" }),
            )}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 dark:border-white/20 dark:bg-white/10"
          >
            <div className="p-5 pb-0">
              <span className="text-sm font-medium text-neutral-900 dark:text-white">
                Dub Links
              </span>
              <p className="mt-3 max-w-56 text-sm text-neutral-500 dark:text-white/60">
                Short links with superpowers for the modern marketer
              </p>
            </div>
            <div className="relative grow overflow-hidden">
              <LinksGraphic className="absolute bottom-0 h-auto w-full [mask-image:linear-gradient(transparent,black_20%,black_80%,transparent)]" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,#f4950c,transparent)] opacity-[0.07] transition-opacity duration-150 group-hover:opacity-[0.2]" />
          </Link>
        </NavigationMenuLink>
        <div className="flex flex-col gap-4">
          <NavigationMenuLink asChild>
            <Link
              href={createHref(
                "/analytics",
                domain,
                getUtmParams({ domain, utm_content: "Dub Analytics" }),
              )}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50 dark:border-white/20 dark:bg-white/10"
            >
              <AnalyticsGraphic className="absolute bottom-0 h-auto w-full translate-y-[15%] [mask-image:linear-gradient(90deg,transparent,black)]" />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,#36D78F,transparent)] opacity-[0.07] transition-opacity duration-150 group-hover:opacity-[0.2]" />
              <div className="h-56 p-5">
                <span className="text-sm font-medium text-neutral-900 dark:text-white">
                  Dub Analytics
                </span>
                <p className="mt-3 max-w-48 text-sm text-neutral-500 dark:text-white/60">
                  Powerful real-time analytics with conversion tracking
                </p>
              </div>
            </Link>
          </NavigationMenuLink>
          <div className="grid grow grid-rows-2 gap-4">
            {largeLinks.map(({ title, description, icon, href }) => (
              <LargeLinkCard
                key={title}
                title={title}
                description={description}
                icon={icon}
                href={createHref(
                  href,
                  domain,
                  getUtmParams({ domain, utm_content: title }),
                )}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="px-6 py-4">
        <p className={cn(contentHeadingClassName, "mb-2")}>Customer Stories</p>
        <div className="grid grid-cols-1">
          {CUSTOMER_STORIES.map(
            ({ icon: Icon, iconClassName, title, description, href }) => (
              <ContentLinkCard
                key={href}
                className="-mx-2"
                href={createHref(
                  href,
                  domain,
                  getUtmParams({ domain, utm_content: title }),
                )}
                icon={
                  <div className="shrink-0 rounded-[10px] border border-neutral-200 bg-white/50 p-2 dark:border-white/20 dark:bg-white/10">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 text-neutral-600 transition-colors dark:text-white/60",
                        iconClassName,
                      )}
                    />
                  </div>
                }
                title={title}
                description={description}
              />
            ),
          )}
          <ContentLinkCard
            className="-mx-2"
            href={createHref(
              "/customers",
              domain,
              getUtmParams({ domain, utm_content: "Customer Stories" }),
            )}
            title="View all stories"
            showArrow
          />
        </div>

        <p className={cn(contentHeadingClassName, "mb-2 mt-5")}>Compare</p>
        <div className="flex flex-col">
          {COMPARE_PAGES.map(({ name, slug }) => (
            <ContentLinkCard
              key={slug}
              className="-mx-2"
              href={createHref(
                `/compare/${slug}`,
                domain,
                getUtmParams({ domain, utm_content: `Dub vs. ${name}` }),
              )}
              title={`Dub vs. ${name}`}
              showArrow
            />
          ))}
        </div>
      </div>
    </div>
  );
}
