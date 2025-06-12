import {
  AnimatedSizeContainer,
  ChevronLeft,
  ClientOnly,
  Icon,
  NavWordmark,
  Tooltip,
} from "@dub/ui";
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
  href: `/${string}`;
  exact?: boolean;
  isActive?: (pathname: string, href: string) => boolean;
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
  onClick?: () => void;

  description: string;
  learnMoreHref?: string;
};

export type SidebarNavGroups<T extends Record<any, any>> = (
  args: T,
) => NavGroupType[];

export type SidebarNavAreas<T extends Record<any, any>> = Record<
  string,
  (args: T) => {
    title?: string;
    backHref?: string;
    showNews?: boolean; // show news segment – TODO: enable this for Partner Program too
    hideSwitcherIcons?: boolean; // hide workspace switcher + product icons for this area
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
      <nav className="grid size-full grid-cols-[64px_1fr]">
        <div className="flex flex-col items-center justify-between">
          <div className="flex flex-col items-center p-2">
            <div className="py-1.5">
              <Link
                href="/"
                className="block rounded-lg px-1 py-3 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-black/50"
              >
                <NavWordmark className="h-5" isInApp />
              </Link>
            </div>
            {!areas[currentArea](data).hideSwitcherIcons && (
              <div className="flex flex-col gap-3">
                {switcher}
                {groups(data).map((group) => (
                  <NavGroupItem key={group.name} group={group} />
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-3 py-3">
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
                  const { title, backHref, content, showNews, direction } =
                    areaConfig(data);

                  const TitleContainer = backHref ? Link : "div";

                  return (
                    <Area
                      key={area}
                      visible={area === currentArea}
                      direction={direction ?? "right"}
                    >
                      {title && (
                        // @ts-ignore - TS can't handle the conditional Link+href
                        <TitleContainer
                          {...(backHref ? { href: backHref } : {})}
                          className="group mb-3 flex items-center gap-3 px-3 py-1"
                        >
                          {backHref && (
                            <div
                              className={cn(
                                "text-content-muted bg-bg-emphasis flex size-6 items-center justify-center rounded-lg",
                                "group-hover:bg-bg-inverted/10 group-hover:text-content-subtle transition-[transform,background-color,color] duration-150 group-hover:-translate-x-0.5",
                              )}
                            >
                              <ChevronLeft className="size-3 [&_*]:stroke-2" />
                            </div>
                          )}
                          <span className="text-content-emphasis text-lg font-semibold">
                            {title}
                          </span>
                        </TitleContainer>
                      )}
                      <div className="flex flex-col gap-8">
                        {content.map(({ name, items }, idx) => (
                          <div key={idx} className="flex flex-col gap-0.5">
                            {name && (
                              <div className="mb-2 pl-3 text-sm text-neutral-500">
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

export function NavGroupTooltip({
  name,
  description,
  learnMoreHref,
  disabled,
  children,
}: PropsWithChildren<{
  name: string;
  description?: string;
  learnMoreHref?: string;
  disabled?: boolean;
}>) {
  return (
    <Tooltip
      side="right"
      delayDuration={100}
      disabled={disabled}
      className="rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white"
      content={
        <div>
          <span>{name}</span>
          {description && (
            <motion.div
              initial={{ opacity: 0, width: 0, height: 0 }}
              animate={{ opacity: 1, width: "auto", height: "auto" }}
              transition={{ delay: 0.5, duration: 0.25, type: "spring" }}
              className="overflow-hidden"
            >
              <div className="w-44 py-1 text-xs tracking-tight">
                <p className="text-content-muted">{description}</p>
                {learnMoreHref && (
                  <div className="mt-2.5">
                    <Link
                      href={learnMoreHref}
                      target="_blank"
                      className="font-semibold text-white underline"
                    >
                      Learn more
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}

function NavGroupItem({
  group: {
    name,
    description,
    learnMoreHref,
    icon: Icon,
    href,
    active,
    onClick,
  },
}: {
  group: NavGroupType;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <NavGroupTooltip
      name={name}
      description={description}
      learnMoreHref={learnMoreHref}
    >
      <div>
        <Link
          href={href}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onClick={onClick}
          className={cn(
            "flex size-11 items-center justify-center rounded-lg transition-colors duration-150",
            "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
            active
              ? "bg-white"
              : "hover:bg-bg-inverted/5 active:bg-bg-inverted/10",
          )}
        >
          <Icon
            className="text-content-default size-5"
            data-hovered={hovered}
          />
        </Link>
      </div>
    </NavGroupTooltip>
  );
}

function NavItem({ item }: { item: NavItemType | NavSubItemType }) {
  const { name, href, exact, isActive: customIsActive } = item;

  const Icon = "icon" in item ? item.icon : undefined;
  const items = "items" in item ? item.items : undefined;

  const [hovered, setHovered] = useState(false);

  const pathname = usePathname();

  const isActive = useMemo(() => {
    if (customIsActive) {
      return customIsActive(pathname, href);
    }

    const hrefWithoutQuery = href.split("?")[0];
    return exact
      ? pathname === hrefWithoutQuery
      : pathname.startsWith(hrefWithoutQuery);
  }, [pathname, href, exact, customIsActive]);

  return (
    <div>
      <Link
        href={href}
        data-active={isActive}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        className={cn(
          "text-content-default group flex items-center gap-2.5 rounded-lg p-2 text-sm leading-none transition-[background-color,color,font-weight] duration-75",
          "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
          isActive && !items
            ? "bg-blue-100/50 font-medium text-blue-600 hover:bg-blue-100/80 active:bg-blue-100"
            : "hover:bg-bg-inverted/5 active:bg-bg-inverted/10",
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "size-4",
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
