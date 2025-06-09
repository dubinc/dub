import { AnimatedSizeContainer, ClientOnly, Icon, NavWordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PropsWithChildren,
  ReactNode,
  Suspense,
  useMemo,
  useState,
} from "react";
import { CreateProgramCard } from "./create-program-card";
import UserDropdown from "./user-dropdown";

export type NavItemCommon = {
  name: string;
  href: string;
  exact?: boolean;
};

export type NavSubItemType = NavItemCommon;

export type NavItemType = NavItemCommon & {
  icon: Icon;
  items?: NavSubItemType[];
};

export type NavGroupType = {
  name: string;
  icon: Icon;
  href: string;
  active: boolean;
};

export type SidebarNavGroups<T extends Record<any, any>> = (
  args: T,
) => NavGroupType[];

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
  groups,
  areas,
  currentArea,
  data,
  toolContent,
  newsContent,
  switcher,
  bottom,
}: {
  groups: SidebarNavGroups<T>;
  areas: SidebarNavAreas<T>;
  currentArea: string;
  data: T;
  toolContent?: ReactNode;
  newsContent?: ReactNode;
  switcher?: ReactNode;
  bottom?: ReactNode;
}) {
  return (
    <ClientOnly className="size-full">
      <nav className="grid size-full grid-cols-[80px_1fr]">
        <div className="flex flex-col items-center justify-between">
          <div className="flex flex-col items-center p-2">
            <Link
              href=""
              className="rounded-md px-1 py-5 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-black/50"
            >
              <NavWordmark className="h-6" isInApp />
            </Link>
            <div className="flex flex-col gap-4">
              {areas[currentArea](data).showSwitcher && switcher && (
                <div>{switcher}</div>
              )}
              {groups(data).map((group) => (
                <NavGroupItem key={group.name} group={group} />
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 py-4">
            <Suspense fallback={null}>{toolContent}</Suspense>
            <div className="flex size-12 items-center justify-center">
              <UserDropdown />
            </div>
          </div>
        </div>
        <div className="size-full overflow-hidden py-1.5 pr-1.5">
          <div className="scrollbar-hide relative flex size-full flex-col overflow-y-auto overflow-x-hidden rounded-2xl bg-neutral-100">
            <div className="relative flex grow flex-col p-3 text-neutral-500">
              <div className="relative w-full grow">
                {Object.entries(areas).map(([area, areaConfig]) => {
                  const { title, content, showNews, direction } =
                    areaConfig(data);
                  return (
                    <Area
                      key={area}
                      visible={area === currentArea}
                      direction={direction ?? "right"}
                    >
                      {title && (
                        <span className="text-content-emphasis mb-3 block px-3 py-1 text-lg font-semibold">
                          {title}
                        </span>
                      )}
                      <div className="flex flex-col gap-4">
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
                      {currentArea === "default" && <CreateProgramCard />}
                      <AnimatePresence>
                        {showNews && (
                          <motion.div
                            className="-mx-3 flex grow flex-col justify-end"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{
                              duration: 0.1,
                              ease: "easeInOut",
                            }}
                          >
                            {newsContent}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Area>
                  );
                })}
              </div>
            </div>
            {bottom && (
              <div className="relative flex flex-col justify-end">{bottom}</div>
            )}
          </div>
        </div>
      </nav>
    </ClientOnly>
  );
}

function NavGroupItem({
  group: { name, icon: Icon, href, active },
}: {
  group: NavGroupType;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        "flex size-12 items-center justify-center rounded-lg transition-colors duration-150",
        active ? "bg-white" : "hover:bg-bg-inverted/5 active:bg-bg-inverted/10",
      )}
    >
      <Icon className="text-content-default size-5" data-hovered={hovered} />
    </Link>
  );
}

function NavItem({ item }: { item: NavItemType | NavSubItemType }) {
  const { name, href, exact } = item;

  const Icon = "icon" in item ? item.icon : undefined;
  const items = "items" in item ? item.items : undefined;

  const [hovered, setHovered] = useState(false);

  const pathname = usePathname();

  const isActive = useMemo(() => {
    const hrefWithoutQuery = href.split("?")[0];
    return exact
      ? pathname === hrefWithoutQuery
      : pathname.startsWith(hrefWithoutQuery);
  }, [pathname, href, exact]);

  return (
    <div>
      <Link
        href={href}
        data-active={isActive}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className={cn(
          "group flex items-center gap-2.5 rounded-md p-2 text-sm leading-none text-neutral-600 transition-[background-color,color,font-weight] duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80",
          "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
          isActive &&
            !items &&
            "bg-blue-100/50 font-medium text-blue-600 hover:bg-blue-100/80 active:bg-blue-100",
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "size-4 text-neutral-500 transition-colors duration-75",
              !items && "group-data-[active=true]:text-blue-600",
            )}
            data-hovered={hovered}
          />
        )}
        {name}
        {items && (
          <div className="flex grow justify-end">
            {items ? (
              <ChevronDown className="size-3.5 text-neutral-500 transition-transform duration-75 group-data-[active=true]:rotate-180" />
            ) : null}
          </div>
        )}
      </Link>
      {items && (
        <AnimatedSizeContainer
          height
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <div
            className={cn(
              "transition-opacity duration-200",
              isActive ? "h-auto" : "h-0 opacity-0",
            )}
            aria-hidden={!isActive}
          >
            <div className="pl-px pt-1">
              <div className="pl-3.5">
                <div className="flex flex-col gap-0.5 border-l border-neutral-200 pl-2">
                  {items.map((item) => (
                    <NavItem key={item.name} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AnimatedSizeContainer>
      )}
    </div>
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
