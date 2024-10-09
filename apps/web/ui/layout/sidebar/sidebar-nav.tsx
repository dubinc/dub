import useWorkspace from "@/lib/swr/use-workspace";
import { Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  PropsWithChildren,
  ReactNode,
  Suspense,
  useMemo,
  useState,
} from "react";
import { ITEMS, type NavItem as NavItemType } from "./items";
import UserDropdown from "./user-dropdown";
import { WorkspaceDropdown } from "./workspace-dropdown";

const AREAS = ["userSettings", "workspaceSettings", "default"] as const;

export function SidebarNav({ toolContent }: { toolContent?: ReactNode }) {
  const { slug } = useParams() as { slug?: string };
  const { flags } = useWorkspace();
  const pathname = usePathname();

  const currentArea = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith(`/${slug}/settings`)
        ? "workspaceSettings"
        : "default";
  }, [slug, pathname]);

  return (
    <div className="relative p-3 text-gray-500">
      <div className="relative flex items-start justify-between gap-1 pb-3">
        {AREAS.map((area) => (
          <Link
            key={area}
            href={slug ? `/${slug}` : "/"}
            className={cn(
              "transition-opacity",
              area === currentArea
                ? "relative opacity-100"
                : "pointer-events-none absolute opacity-0",
            )}
            aria-hidden={area !== currentArea ? true : undefined}
          >
            {area === "default" ? (
              <div className="pb-1">
                <Wordmark className="ml-1 h-6" />
              </div>
            ) : (
              <div className="py group -my-1 flex items-center gap-2 py-2 text-sm font-medium text-neutral-900">
                <ChevronLeft className="size-4 text-neutral-500 transition-transform duration-100 group-hover:-translate-x-0.5" />
                Settings
              </div>
            )}
          </Link>
        ))}
        <div className="hidden items-center gap-3 md:flex">
          <Suspense fallback={null}>{toolContent}</Suspense>
          <UserDropdown />
        </div>
      </div>
      <div className="relative w-full">
        {AREAS.map((area) => (
          <Area
            key={area}
            visible={area === currentArea}
            direction={area === "default" ? "left" : "right"}
          >
            {area === "default" && (
              <div className="pt-2">
                <WorkspaceDropdown />
              </div>
            )}

            <div className="flex flex-col gap-4 pt-4">
              {ITEMS[area].map(({ name, items }, idx) => (
                <div key={idx} className="flex flex-col gap-0.5">
                  {name && (
                    <div className="mb-2 pl-1 text-sm text-neutral-500">
                      {name}
                    </div>
                  )}
                  {items({ slug: slug || "", flags }).map((item) => (
                    <NavItem key={item.name} pathname={pathname} item={item} />
                  ))}
                </div>
              ))}
            </div>
          </Area>
        ))}
      </div>
    </div>
  );
}

function NavItem({ item }: { item: NavItemType }) {
  const { name, icon: Icon, href, exact } = item;

  const pathname = usePathname();

  const isActive = useMemo(
    () => (exact ? pathname === href : pathname.startsWith(href)),
    [exact, pathname, href],
  );

  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      data-active={isActive}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        "group flex items-center gap-2.5 rounded-md p-2 text-sm leading-none text-neutral-600 transition-[background-color,color,font-weight] duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80",
        isActive &&
          "bg-blue-100/50 font-medium text-blue-600 hover:bg-blue-100/80 active:bg-blue-100",
      )}
    >
      <Icon
        className="size-4 text-neutral-500 transition-colors duration-75 group-data-[active=true]:text-blue-600"
        data-hovered={hovered}
      />
      {name}
    </Link>
  );
}

export function Area({
  visible,
  direction,
  children,
}: PropsWithChildren<{ visible: boolean; direction: "left" | "right" }>) {
  return (
    <div
      className={cn(
        "left-0 top-0 w-full transition-[opacity,transform] duration-300",
        visible
          ? "opacity-1 relative"
          : cn(
              "pointer-events-none absolute opacity-0",
              direction === "left" ? "-translate-x-full" : "translate-x-full",
            ),
      )}
      aria-hidden={!visible ? "true" : undefined}
    >
      {children}
    </div>
  );
}
