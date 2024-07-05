import NavLink from "@/ui/layout/settings-nav-link";
import { Icon, MaxWidthWrapper } from "@dub/ui";
import { cn } from "@dub/utils";
import { ReactNode } from "react";

export default function SettingsLayout({
  tabs,
  tabContainerClassName,
  children,
}: {
  tabs: {
    name: string;
    icon: Icon;
    segment: string | null;
  }[];
  tabContainerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-[calc(100vh-16px)] bg-white">
      <MaxWidthWrapper className="grid items-start gap-8 py-10 lg:grid-cols-5">
        <div
          className={cn("flex gap-1 lg:sticky lg:grid", tabContainerClassName)}
        >
          {tabs.map(({ name, segment, icon }) => (
            <NavLink segment={segment} icon={icon}>
              {name}
            </NavLink>
          ))}
        </div>
        <div className="grid gap-5 lg:col-span-4">{children}</div>
      </MaxWidthWrapper>
    </div>
  );
}
