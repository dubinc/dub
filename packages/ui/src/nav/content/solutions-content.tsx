import { cn, createHref } from "@dub/utils";
import { SDKS } from "../../content";
import {
  DiamondTurnRight,
  Microphone,
  OfficeBuilding,
  Rocket,
  Users,
} from "../../icons";
import {
  ContentLinkCard,
  NAV_UTM_PARAMS,
  contentHeadingClassName,
} from "./shared";

const useCaseLinks = [
  {
    icon: Users,
    title: "Affiliate Management",
    description: "Manage affiliates and automate payouts",
    href: "/partners",
  },
  {
    icon: DiamondTurnRight,
    title: "Marketing Attribution",
    description: "Easily track and measure marketing impact",
    href: "/analytics",
  },
  {
    icon: Microphone,
    title: "For Content Creators",
    description: "Intelligent audience insights and link tracking",
    href: "/solutions/creators",
  },
];

const stageLinks = [
  {
    icon: OfficeBuilding,
    title: "Enterprise",
    description: "Partner programs built for enterprise scale",
    href: "/enterprise",
  },
  {
    icon: Rocket,
    title: "Startups",
    description: "Discounted access for early-stage startups",
    href: "/startups",
  },
];

export function SolutionsContent({ domain }: { domain: string }) {
  return (
    <div className="grid w-[1020px] grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,2fr)] divide-x divide-neutral-200 dark:divide-white/20">
      <div className="px-6 py-4">
        <p className={cn(contentHeadingClassName, "mb-2")}>Use case</p>
        <div className="flex flex-col gap-0.5">
          {useCaseLinks.map(({ icon: Icon, title, description, href }) => (
            <ContentLinkCard
              key={href}
              className="-mx-2"
              href={createHref(href, domain, {
                ...NAV_UTM_PARAMS,
                utm_campaign: domain,
                utm_content: title,
              })}
              icon={
                <div className="shrink-0 rounded-md border border-neutral-200 bg-white/50 p-2.5 dark:border-white/20 dark:bg-white/10">
                  <Icon
                    variant="fill"
                    className="size-4 text-neutral-600 dark:text-white/60"
                  />
                </div>
              }
              title={title}
              description={description}
            />
          ))}
        </div>
      </div>

      <div className="px-6 py-4">
        <p className={cn(contentHeadingClassName, "mb-2")}>Stage</p>
        <div className="flex flex-col gap-0.5">
          {stageLinks.map(({ icon: Icon, title, description, href }) => (
            <ContentLinkCard
              key={href}
              className="-mx-2"
              href={createHref(href, domain, {
                ...NAV_UTM_PARAMS,
                utm_campaign: domain,
                utm_content: title,
              })}
              icon={
                <div className="shrink-0 rounded-md border border-neutral-200 bg-white/50 p-2.5 dark:border-white/20 dark:bg-white/10">
                  <Icon
                    variant="fill"
                    className="size-4 text-neutral-600 dark:text-white/60"
                  />
                </div>
              }
              title={title}
              description={description}
            />
          ))}
        </div>
      </div>

      <div className="px-6 py-4">
        <p className={cn(contentHeadingClassName, "mb-2")}>SDKs</p>
        <div className="flex flex-col gap-0.5">
          {SDKS.map(({ icon: Icon, iconClassName, title, href }) => (
            <ContentLinkCard
              key={href}
              className="-mx-2 gap-1.5 py-1"
              href={createHref(href, domain, {
                ...NAV_UTM_PARAMS,
                utm_campaign: domain,
                utm_content: title,
              })}
              icon={
                <div className="shrink-0 rounded-lg border border-neutral-200 bg-white/50 p-1 dark:border-white/20 dark:bg-white/10">
                  <Icon
                    className={cn(
                      "size-4 text-neutral-600 transition-colors dark:text-white/60",
                      iconClassName,
                    )}
                  />
                </div>
              }
              title={title}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
