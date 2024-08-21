import { Icon, MaxWidthWrapper } from "@dub/ui";
import { cn } from "@dub/utils";
import { ReactNode } from "react";
import NavLink from "./settings-nav-link";
import { SettingsNavMobile } from "./settings-nav-mobile";

interface Tab {
  name: string;
  icon: Icon;
  segment: string | null;
}

export interface SettingsLayoutProps {
  tabs: {
    group: string;
    tabs: Tab[];
  }[];
  tabContainerClassName?: string;
  children: ReactNode;
}

export default function SettingsLayout({
  tabs,
  tabContainerClassName,
  children,
}: SettingsLayoutProps) {
  return (
    <div className="relative min-h-[calc(100vh-16px)] bg-white">
      <MaxWidthWrapper className="grid items-start gap-8 py-10 lg:grid-cols-5">
        <div className="lg:hidden">
          <SettingsNavMobile tabs={tabs}>
            <Tabs tabs={tabs} />
          </SettingsNavMobile>
        </div>
        <div
          className={cn(
            "hidden flex-wrap gap-4 lg:sticky lg:flex lg:grid",
            tabContainerClassName,
          )}
        >
          <Tabs tabs={tabs} />
        </div>
        <div className="grid gap-5 lg:col-span-4">{children}</div>
      </MaxWidthWrapper>
    </div>
  );
}

function Tabs({ tabs }: Pick<SettingsLayoutProps, "tabs">) {
  return (
    <>
      {tabs.map(({ group, tabs }) => (
        <div className="flex flex-col gap-y-0.5">
          {group && (
            <span className="pb-1.5 text-sm text-gray-500">{group}</span>
          )}

          {tabs.map(({ name, icon, segment }) => (
            <NavLink segment={segment} icon={icon}>
              {name}
            </NavLink>
          ))}
        </div>
      ))}
    </>
  );
}
