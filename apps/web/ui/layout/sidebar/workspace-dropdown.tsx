"use client";

import useWorkspaces from "@/lib/swr/use-workspaces";
import { PlanProps, WorkspaceProps } from "@/lib/types";
import { ModalContext } from "@/ui/modals/modal-provider";
import {
  BlurImage,
  getUserAvatarUrl,
  Popover,
  useScrollProgress,
} from "@dub/ui";
import { Book2, Check2, Plus } from "@dub/ui/icons";
import { cn, DICEBEAR_AVATAR_URL } from "@dub/utils";
import { ChevronsUpDown, HelpCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export function WorkspaceDropdown() {
  const { workspaces } = useWorkspaces();
  const { data: session, status } = useSession();
  const { slug: currentSlug, key } = useParams() as {
    slug?: string;
    key?: string;
  };

  // Prevent slug from changing to empty to avoid UI switching during nav animation
  const [slug, setSlug] = useState(currentSlug);
  useEffect(() => {
    if (currentSlug) setSlug(currentSlug);
  }, [currentSlug]);

  const selected = useMemo(() => {
    const selectedWorkspace = workspaces?.find(
      (workspace) => workspace.slug === slug,
    );

    if (slug && workspaces && selectedWorkspace) {
      return {
        ...selectedWorkspace,
        image:
          selectedWorkspace.logo ||
          `${DICEBEAR_AVATAR_URL}${selectedWorkspace.name}`,
      };

      // return personal account selector if there's no workspace or error (user doesn't have access to workspace)
    } else {
      return {
        name: session?.user?.name || session?.user?.email,
        slug: "/",
        image: getUserAvatarUrl(session?.user),
        plan: "free",
      };
    }
  }, [slug, workspaces, session]) as {
    id?: string;
    name: string;
    slug: string;
    image: string;
    plan: PlanProps;
  };

  const [openPopover, setOpenPopover] = useState(false);

  if (!workspaces || status === "loading") {
    return <WorkspaceDropdownPlaceholder />;
  }

  return (
    <div>
      <Popover
        content={
          <WorkspaceList
            selected={selected}
            workspaces={workspaces}
            setOpenPopover={setOpenPopover}
          />
        }
        align="start"
        openPopover={openPopover}
        setOpenPopover={setOpenPopover}
      >
        <button
          onClick={() => setOpenPopover(!openPopover)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg p-1.5 text-left text-sm transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80 data-[state=open]:bg-neutral-200/80",
            "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
          )}
        >
          <div className="flex min-w-0 items-center gap-x-2.5 pr-2">
            <BlurImage
              src={selected.image}
              referrerPolicy="no-referrer"
              width={28}
              height={28}
              alt={selected.id || selected.name}
              className="h-7 w-7 flex-none shrink-0 overflow-hidden rounded-full"
            />
            <div className={cn(key ? "hidden" : "block", "min-w-0 sm:block")}>
              <div className="truncate text-sm font-medium leading-5 text-neutral-900">
                {selected.name}
              </div>
              {selected.slug !== "/" && (
                <div
                  className={cn(
                    "truncate text-xs capitalize leading-tight",
                    getPlanColor(selected.plan),
                  )}
                >
                  {selected.plan}
                </div>
              )}
            </div>
          </div>
          <ChevronsUpDown
            className="size-4 shrink-0 text-neutral-400"
            aria-hidden="true"
          />
        </button>
      </Popover>
    </div>
  );
}

function WorkspaceDropdownPlaceholder() {
  return (
    <div className="flex w-full animate-pulse items-center gap-x-1.5 rounded-lg p-1.5">
      <div className="size-7 animate-pulse rounded-full bg-neutral-200" />
      <div className="mb-px mt-0.5 h-8 w-28 grow animate-pulse rounded-md bg-neutral-200" />
      <ChevronsUpDown className="h-4 w-4 text-neutral-400" aria-hidden="true" />
    </div>
  );
}

const LINKS = [
  {
    name: "Help Center",
    icon: HelpCircle,
    href: "https://dub.co/help",
    target: "_blank",
  },
  {
    name: "Documentation",
    icon: Book2,
    href: "https://dub.co/docs",
    target: "_blank",
  },
];

function WorkspaceList({
  selected,
  workspaces,
  setOpenPopover,
}: {
  selected: {
    name: string;
    slug: string;
    image: string;
    plan: PlanProps;
  };
  workspaces: WorkspaceProps[];
  setOpenPopover: (open: boolean) => void;
}) {
  const { setShowAddWorkspaceModal } = useContext(ModalContext);
  const { domain, key, programId } = useParams() as {
    domain?: string;
    key?: string;
    programId?: string;
  };
  const pathname = usePathname();

  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollProgress, updateScrollProgress } = useScrollProgress(scrollRef);

  const href = useCallback(
    (slug: string) => {
      if (domain || key || programId || selected.slug === "/") {
        // if we're on a link or program page, navigate back to the workspace root
        return `/${slug}`;
      } else {
        // else, we keep the path but remove all query params
        return pathname?.replace(selected.slug, slug).split("?")[0] || "/";
      }
    },
    [domain, key, programId, pathname, selected.slug],
  );

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        onScroll={updateScrollProgress}
        className="relative max-h-80 w-full space-y-0.5 overflow-auto rounded-lg bg-white text-base sm:w-64 sm:text-sm"
      >
        <div className="flex flex-col gap-0.5 border-b border-neutral-200 p-2">
          {LINKS.map(({ name, icon: Icon, href, target }) => (
            <Link
              key={name}
              href={href}
              target={target}
              className={cn(
                "flex items-center gap-x-4 rounded-md px-2.5 py-2 transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80",
                "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
              )}
              onClick={() => setOpenPopover(false)}
            >
              <Icon className="size-4 text-neutral-500" />
              <span className="block truncate text-neutral-600">{name}</span>
            </Link>
          ))}
        </div>
        <div className="p-2">
          <div className="flex items-center justify-between pb-1">
            <p className="px-1 text-xs font-medium text-neutral-500">
              Workspaces
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            {workspaces.map(({ id, name, slug, logo, plan }) => {
              const isActive = selected.slug === slug;
              return (
                <Link
                  key={slug}
                  className={cn(
                    "relative flex w-full items-center gap-x-2 rounded-md px-2 py-1.5 transition-all duration-75",
                    "hover:bg-neutral-200/50 active:bg-neutral-200/80",
                    "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
                    isActive && "bg-neutral-200/50",
                  )}
                  href={href(slug)}
                  shallow={false}
                  onClick={() => setOpenPopover(false)}
                >
                  <BlurImage
                    src={logo || `${DICEBEAR_AVATAR_URL}${name}`}
                    width={28}
                    height={28}
                    alt={id}
                    className="size-7 shrink-0 overflow-hidden rounded-full"
                  />
                  <div>
                    <span className="block truncate text-sm leading-5 text-neutral-900 sm:max-w-[140px]">
                      {name}
                    </span>
                    {slug !== "/" && (
                      <div
                        className={cn(
                          "truncate text-xs capitalize leading-tight",
                          getPlanColor(plan),
                        )}
                      >
                        {plan}
                      </div>
                    )}
                  </div>
                  {selected.slug === slug ? (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-black">
                      <Check2 className="size-4" aria-hidden="true" />
                    </span>
                  ) : null}
                </Link>
              );
            })}
            <button
              key="add"
              onClick={() => {
                setOpenPopover(false);
                setShowAddWorkspaceModal(true);
              }}
              className="group flex w-full cursor-pointer items-center gap-x-2 rounded-md p-2 text-neutral-700 transition-all duration-75 hover:bg-neutral-200/50 active:bg-neutral-200/80"
            >
              <Plus className="mx-1.5 size-4 text-neutral-500" />
              <span className="block truncate">Create new workspace</span>
            </button>
          </div>
        </div>
      </div>
      {/* Bottom scroll fade */}
      <div
        className="pointer-events-none absolute -bottom-px left-0 h-16 w-full rounded-b-lg bg-gradient-to-t from-white sm:bottom-0"
        style={{ opacity: 1 - Math.pow(scrollProgress, 2) }}
      />
    </div>
  );
}

const getPlanColor = (plan: string) =>
  plan === "enterprise"
    ? "text-purple-700"
    : plan === "advanced"
      ? "text-amber-800"
      : plan.startsWith("business")
        ? "text-blue-900"
        : plan === "pro"
          ? "text-cyan-900"
          : "text-neutral-500";
