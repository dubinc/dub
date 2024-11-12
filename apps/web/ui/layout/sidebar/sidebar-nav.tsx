import { ClientOnly, Icon, NavWordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PropsWithChildren,
  ReactNode,
  Suspense,
  useMemo,
  useState,
} from "react";
import UserDropdown from "./user-dropdown";

export type NavItemType = {
  name: string;
  icon: Icon;
  href: string;
  exact?: boolean;
};

export type SidebarNavAreas<T extends Record<any, any>> = Record<
  string,
  (args: T) => {
    title?: string;
    backHref?: string;
    showSwitcher?: boolean;
    showNews?: boolean;
    direction?: "left" | "right";
    content: {
      name?: string;
      items: NavItemType[];
    }[];
  }
>;

export function SidebarNav<T extends Record<any, any>>({
  areas,
  currentArea,
  data,
  toolContent,
  newsContent,
  switcher,
  bottom,
}: {
  areas: SidebarNavAreas<T>;
  currentArea: string;
  data: T;
  toolContent?: ReactNode;
  newsContent?: ReactNode;
  switcher?: ReactNode;
  bottom?: ReactNode;
}) {
  return (
    <ClientOnly className="scrollbar-hide relative flex h-full w-full flex-col overflow-y-auto overflow-x-hidden">
      <nav className="relative flex grow flex-col p-3 text-gray-500">
        <div className="relative flex items-start justify-between gap-1 pb-3">
          {Object.entries(areas).map(([area, areaConfig]) => {
            const { title, backHref } = areaConfig(data);

            return (
              <Link
                key={area}
                href={backHref ?? "/"}
                className={cn(
                  "rounded-md px-1 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-black/50",
                  area === currentArea
                    ? "relative opacity-100"
                    : "pointer-events-none absolute opacity-0",
                  (!title || !backHref) && "mb-1",
                )}
                aria-hidden={area !== currentArea ? true : undefined}
                {...{ inert: area !== currentArea ? "" : undefined }}
              >
                {title && backHref ? (
                  <div className="py group -my-1 -ml-1 flex items-center gap-2 py-2 pr-1 text-sm font-medium text-neutral-900">
                    <ChevronLeft className="size-4 text-neutral-500 transition-transform duration-100 group-hover:-translate-x-0.5" />
                    {title}
                  </div>
                ) : (
                  <NavWordmark className="h-6" isInApp />
                )}
              </Link>
            );
          })}
          <div className="hidden items-center gap-3 md:flex">
            <Suspense fallback={null}>{toolContent}</Suspense>
            <UserDropdown />
          </div>
        </div>
        <div className="relative w-full grow">
          {Object.entries(areas).map(([area, areaConfig]) => {
            const { content, showSwitcher, showNews, direction } =
              areaConfig(data);
            return (
              <Area
                key={area}
                visible={area === currentArea}
                direction={direction ?? "right"}
              >
                {showSwitcher && switcher && (
                  <div className="pt-2">{switcher}</div>
                )}

                <div className="flex flex-col gap-4 pt-4">
                  {content.map(({ name, items }, idx) => (
                    <div key={idx} className="flex flex-col gap-0.5">
                      {name && (
                        <div className="mb-2 pl-1 text-sm text-neutral-500">
                          {name}
                        </div>
                      )}
                      {items.map((item) => (
                        <NavItem key={item.name} item={item} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="-mx-3 mt-6 flex grow flex-col justify-end">
                  {showNews && newsContent}
                </div>
              </Area>
            );
          })}
        </div>
      </nav>
      {bottom && (
        <div className="relative flex flex-col justify-end">{bottom}</div>
      )}
    </ClientOnly>
  );
}

function NavItem({ item }: { item: NavItemType }) {
  const { name, icon: Icon, href, exact } = item;

  const [hovered, setHovered] = useState(false);

  const pathname = usePathname();

  const isActive = useMemo(() => {
    const hrefWithoutQuery = href.split("?")[0];
    return exact
      ? pathname === hrefWithoutQuery
      : pathname.startsWith(hrefWithoutQuery);
  }, [pathname, href, exact]);

  return (
    <Link
      href={href}
      data-active={isActive}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        "group flex items-center gap-2.5 rounded-md p-2 text-sm leading-none text-neutral-600 transition-[background-color,color,font-weight] duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80",
        "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
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
        "left-0 top-0 flex size-full flex-col md:transition-[opacity,transform] md:duration-300",
        visible
          ? "opacity-1 relative"
          : cn(
              "pointer-events-none absolute opacity-0",
              direction === "left" ? "-translate-x-full" : "translate-x-full",
            ),
      )}
      aria-hidden={!visible ? "true" : undefined}
      {...{ inert: !visible ? "" : undefined }}
    >
      {children}
    </div>
  );
}
