import { Icon, MaxWidthWrapper } from "@dub/ui";
import { cn } from "@dub/utils";
import { ReactNode } from "react";
import NavLink from "./settings-nav-link";

interface Tab {
  name: string;
  icon: Icon;
  segment: string | null;
}

interface SettingsLayoutProps {
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
        <div
          className={cn(
            "flex flex-wrap gap-4 lg:sticky lg:grid",
            tabContainerClassName,
          )}
        >
          {tabs.map(({ group, tabs }) => (
            <div className="flex flex-col">
              {group && (
                <span className="pb-2 text-sm text-gray-500">{group}</span>
              )}

              {tabs.map(({ name, icon, segment }) => (
                <NavLink segment={segment} icon={icon}>
                  {name}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        <div className="grid gap-5 lg:col-span-4">{children}</div>
      </MaxWidthWrapper>
    </div>
  );
}
