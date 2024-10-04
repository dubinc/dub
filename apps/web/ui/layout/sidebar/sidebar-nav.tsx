import { Wordmark } from "@dub/ui";
import { CursorRays, Hyperlink, LinesY } from "@dub/ui/src";
import { cn } from "@dub/utils";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, Suspense, useMemo } from "react";
import UserDropdown from "./user-dropdown";
import { WorkspaceDropdown } from "./workspace-dropdown";

export function SidebarNav({ toolContent }: { toolContent?: ReactNode }) {
  const { slug } = useParams() as { slug?: string };
  const pathname = usePathname();

  const tabs = useMemo(
    () => [
      { name: "Links", icon: Hyperlink, href: `/${slug}` },
      { name: "Analytics", icon: LinesY, href: `/${slug}/analytics` },
      { name: "Events", icon: CursorRays, href: `/${slug}/events` },
    ],
    [slug],
  );

  return (
    <div className="relative p-3 text-gray-500">
      <div className="flex items-start justify-between gap-1">
        <Wordmark className="ml-1 h-6" />
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>{toolContent}</Suspense>
          <UserDropdown />
        </div>
      </div>

      <div className="mt-7">
        <WorkspaceDropdown />
      </div>

      <div className="mt-4 flex flex-col gap-0.5">
        {tabs.map(({ name, icon: Icon, href }) => {
          const isActive =
            href === `/${slug}` ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-md p-2 text-sm text-neutral-600 transition-colors duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80",
                isActive && "bg-neutral-200/50",
              )}
            >
              <Icon className="size-4 text-gray-500" />
              {name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
