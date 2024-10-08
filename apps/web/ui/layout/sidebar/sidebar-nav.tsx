import useWorkspace from "@/lib/swr/use-workspace";
import { Wordmark } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ReactNode, Suspense, useMemo } from "react";
import { ITEMS } from "./items";
import UserDropdown from "./user-dropdown";
import { WorkspaceDropdown } from "./workspace-dropdown";

export function SidebarNav({ toolContent }: { toolContent?: ReactNode }) {
  const { slug } = useParams() as { slug?: string };
  const { flags } = useWorkspace();
  const pathname = usePathname();

  const area = useMemo(() => {
    return pathname.startsWith("/account/settings")
      ? "userSettings"
      : pathname.startsWith(`/${slug}/settings`)
        ? "workspaceSettings"
        : "default";
  }, [slug, pathname]);

  const itemGroups = useMemo(() => ITEMS[area], [area]);

  return (
    <div className="relative p-3 text-gray-500">
      <div className="relative mb-7 flex items-start justify-between gap-1">
        <AnimatePresence>
          <motion.div
            key={area}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{
              opacity: 0,
              position: "absolute",
            }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          >
            {area === "default" ? (
              <Wordmark className="ml-1 h-6" />
            ) : (
              <Link
                href={slug ? `/${slug}` : "/"}
                className="group -my-1 flex items-center gap-2 py-2 text-sm font-medium text-neutral-900"
              >
                <ChevronLeft className="size-4 text-neutral-500 transition-transform duration-100 group-hover:-translate-x-0.5" />
                Settings
              </Link>
            )}
          </motion.div>
        </AnimatePresence>
        <div className="hidden items-center gap-3 md:flex">
          <Suspense fallback={null}>{toolContent}</Suspense>
          <UserDropdown />
        </div>
      </div>
      <div className="relative w-full">
        <AnimatePresence>
          <motion.div
            key={area}
            className="relative left-0 top-0 w-full"
            initial={{ opacity: 0, x: area === "default" ? "-100%" : "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{
              opacity: 0,
              position: "absolute",
              x: area === "default" ? "-100%" : "100%",
            }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          >
            {area === "default" && (
              <div className="mt-7">
                <WorkspaceDropdown />
              </div>
            )}

            <div className="mt-4 flex flex-col gap-4">
              {itemGroups.map(({ name, items }, idx) => (
                <div key={`${name}-${idx}`} className="flex flex-col gap-0.5">
                  {name && (
                    <div className="mb-2 pl-1 text-sm text-neutral-500">
                      {name}
                    </div>
                  )}
                  {items({ slug: slug || "", flags }).map(
                    ({ name, icon: Icon, href, exact }) => {
                      const isActive = exact
                        ? pathname === href
                        : pathname.startsWith(href);

                      return (
                        <Link
                          key={href}
                          href={href}
                          data-active={isActive}
                          className={cn(
                            "group flex items-center gap-2.5 rounded-md p-2 text-sm leading-none text-neutral-600 transition-[color,font-weight] duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80",
                            isActive &&
                              "bg-blue-100/50 font-medium text-blue-600 hover:bg-blue-100/80 active:bg-blue-100",
                          )}
                        >
                          <Icon
                            className="size-4 text-neutral-500 transition-colors duration-75 group-data-[active=true]:text-blue-600"
                            isActive={isActive}
                          />
                          {name}
                        </Link>
                      );
                    },
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
