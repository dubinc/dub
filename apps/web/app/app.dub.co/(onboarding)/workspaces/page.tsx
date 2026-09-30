"use client";

import useWorkspaces from "@/lib/swr/use-workspaces";
import { WorkspaceProps } from "@/lib/types";
import { NavButton } from "@/ui/layout/page-content/nav-button";
import { useAddWorkspaceModal } from "@/ui/modals/add-workspace-modal";
import { useDeleteAccountModal } from "@/ui/modals/delete-account-modal";
import { ModalContext } from "@/ui/modals/modal-provider";
import { UserAvatar } from "@/ui/users/user-avatar";
import PlanBadge from "@/ui/workspaces/plan-badge";
import { BlurImage, Button, Grid, StatusBadge, useMediaQuery } from "@dub/ui";
import { ChevronRight, Magnifier, OfficeBuilding, Plus } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ComponentType,
  SVGProps,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export default function WorkspacesPage() {
  const { workspaces, error } = useWorkspaces();

  return (
    <div className="relative min-h-full">
      <div className="absolute left-3 top-3 lg:hidden">
        <NavButton />
      </div>
      <div className="mx-auto flex w-full max-w-[480px] flex-col px-4 pb-16 pt-20 sm:pt-28">
        {error ? (
          <PageHeader
            icon={OfficeBuilding}
            title="Unable to load workspaces"
            description="Something went wrong while fetching your workspaces. Please refresh the page to try again."
          />
        ) : !workspaces ? (
          <WorkspaceListSkeleton />
        ) : workspaces.length > 0 ? (
          <WorkspaceList workspaces={workspaces} />
        ) : (
          <NoWorkspaces />
        )}
      </div>
    </div>
  );
}

function PageHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_1px_2px_0_rgb(0_0_0/0.04)]">
        <Grid
          cellSize={8}
          className="text-neutral-100 [mask-image:radial-gradient(circle,black,transparent_75%)]"
        />
        <Icon className="relative size-5 text-neutral-700" />
      </div>
      <h1 className="mt-6 text-xl font-semibold text-neutral-900">{title}</h1>
      <p className="mt-1.5 max-w-sm text-pretty text-sm text-neutral-500">
        {description}
      </p>
    </div>
  );
}

function WorkspaceList({ workspaces }: { workspaces: WorkspaceProps[] }) {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const { setShowAddWorkspaceModal } = useContext(ModalContext);

  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredWorkspaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return workspaces;

    return workspaces.filter(
      ({ name, slug }) =>
        name.toLowerCase().includes(query) ||
        slug.toLowerCase().includes(query),
    );
  }, [workspaces, search]);

  const moveActiveIndex = (delta: number) => {
    const count = filteredWorkspaces.length;
    if (!count) return;

    const nextIndex = (activeIndex + delta + count) % count;
    setActiveIndex(nextIndex);
    listRef.current
      ?.querySelector(`[data-index="${nextIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="animate-slide-up-fade">
      <PageHeader
        icon={OfficeBuilding}
        title="Your workspaces"
        description="Choose a workspace to continue"
      />

      <div className="relative mt-8">
        <Magnifier className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          aria-label="Search workspaces"
          placeholder="Find workspace..."
          autoFocus={!isMobile}
          autoComplete="off"
          spellCheck={false}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              moveActiveIndex(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              moveActiveIndex(-1);
            } else if (e.key === "Enter") {
              const workspace = filteredWorkspaces[activeIndex];
              if (workspace) {
                e.preventDefault();
                router.push(`/${workspace.slug}`);
              }
            }
          }}
          className={cn(
            "block h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3.5 text-sm text-neutral-900 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] duration-150",
            "placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-200/60",
          )}
        />
      </div>

      <div ref={listRef} className="mt-3 flex flex-col gap-0.5">
        {filteredWorkspaces.length > 0 ? (
          filteredWorkspaces.map((workspace, index) => (
            <WorkspaceRow
              key={workspace.id}
              workspace={workspace}
              index={index}
              active={index === activeIndex}
              onHover={() => setActiveIndex(index)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <p className="text-sm font-medium text-neutral-900">
              No workspaces found
            </p>
            <p className="mt-1 max-w-full truncate text-sm text-neutral-500">
              No workspaces match &ldquo;{search.trim()}&rdquo;
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-neutral-200 pt-2">
        <button
          type="button"
          onClick={() => setShowAddWorkspaceModal(true)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-600 transition-colors duration-75",
            "hover:bg-neutral-100 hover:text-neutral-900 active:bg-neutral-200/60",
            "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
          )}
        >
          <div className="flex size-6 items-center justify-center rounded-full border border-dashed border-neutral-300 transition-colors duration-75 group-hover:border-neutral-400">
            <Plus className="size-3 text-neutral-500 group-hover:text-neutral-700" />
          </div>
          Create workspace
        </button>
      </div>
    </div>
  );
}

function WorkspaceRow({
  workspace: { id, name, slug, logo, plan, partnersLimit, disabledAt },
  index,
  active,
  onHover,
}: {
  workspace: WorkspaceProps;
  index: number;
  active: boolean;
  onHover: () => void;
}) {
  return (
    <Link
      href={`/${slug}`}
      data-index={index}
      data-active={active}
      // pointermove (rather than pointerenter) so keyboard-driven scrolling doesn't steal the highlight
      onPointerMove={onHover}
      onFocus={onHover}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-75",
        "active:!bg-neutral-200/60 data-[active=true]:bg-neutral-100",
        "outline-none focus-visible:ring-2 focus-visible:ring-black/50",
      )}
    >
      <BlurImage
        src={logo || `https://avatar.vercel.sh/${id}`}
        width={24}
        height={24}
        alt={name}
        className="size-6 shrink-0 overflow-hidden rounded-full"
        draggable={false}
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
        {name}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        {disabledAt && (
          <StatusBadge variant="neutral" size="sm" icon={null}>
            Disabled
          </StatusBadge>
        )}
        <PlanBadge plan={plan} />
      </div>
      <ChevronRight className="size-3 shrink-0 -translate-x-1 text-neutral-400 opacity-0 transition-[opacity,transform] duration-150 group-data-[active=true]:translate-x-0 group-data-[active=true]:opacity-100" />
    </Link>
  );
}

function WorkspaceListSkeleton() {
  return (
    <div>
      <div className="flex flex-col items-center">
        <div className="size-12 animate-pulse rounded-xl bg-neutral-100" />
        <div className="mt-6 h-7 w-44 animate-pulse rounded-md bg-neutral-100" />
        <div className="mt-2 h-5 w-56 animate-pulse rounded-md bg-neutral-100" />
      </div>
      <div className="mt-8 h-11 w-full animate-pulse rounded-xl bg-neutral-100" />
      <div className="mt-3 flex flex-col gap-0.5">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="flex items-center gap-3 px-3 py-2.5">
            <div className="size-6 animate-pulse rounded-full bg-neutral-100" />
            <div
              className="h-4 animate-pulse rounded bg-neutral-100"
              style={{ width: `${[40, 28, 52, 34][idx]}%` }}
            />
            <div className="ml-auto h-[18px] w-12 animate-pulse rounded-full bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NoWorkspaces() {
  const { data: session } = useSession();
  const { AddWorkspaceModal, setShowAddWorkspaceModal } =
    useAddWorkspaceModal();
  const { setShowDeleteAccountModal, DeleteAccountModal } =
    useDeleteAccountModal();

  return (
    <div className="animate-slide-up-fade">
      <AddWorkspaceModal />
      <DeleteAccountModal />
      <PageHeader
        icon={OfficeBuilding}
        title="No workspaces yet"
        description="Workspaces are where you manage your short links, analytics, and partner programs. Create one to get started."
      />

      <Button
        text="Create workspace"
        icon={<Plus className="size-4" />}
        onClick={() => setShowAddWorkspaceModal(true)}
        className="mt-8 h-11 rounded-xl text-sm"
      />

      <div className="mt-10 flex items-center gap-3 border-t border-neutral-200 pt-6">
        <UserAvatar user={session?.user} className="size-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900">
            {session?.user?.name || session?.user?.email}
          </p>
          {session?.user?.name && (
            <p className="truncate text-xs text-neutral-500">
              {session.user.email}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowDeleteAccountModal(true)}
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition-colors duration-75",
            "hover:bg-red-50 hover:text-red-600 active:bg-red-100",
            "outline-none focus-visible:ring-2 focus-visible:ring-red-500/50",
          )}
        >
          Delete account
        </button>
      </div>
    </div>
  );
}
