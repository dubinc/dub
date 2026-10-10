"use client";

import { isStagingEnvironment } from "@/lib/sandbox/environment";
import useWorkspaces from "@/lib/swr/use-workspaces";
import { WorkspaceProps } from "@/lib/types";
import { useAddWorkspaceModal } from "@/ui/modals/add-workspace-modal";
import { useDeleteAccountModal } from "@/ui/modals/delete-account-modal";
import PlanBadge from "@/ui/workspaces/plan-badge";
import { BlurImage, Button, Grid, StatusBadge, useMediaQuery } from "@dub/ui";
import { ChevronRight, Magnifier, OfficeBuilding, Plus } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { SignedInHint } from "app/app.dub.co/(onboarding)/signed-in-hint";
import { Command, useCommandState } from "cmdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ComponentType, SVGProps, useState } from "react";

export default function WorkspacesPage() {
  const { workspaces, error } = useWorkspaces();
  const visibleWorkspaces = workspaces?.filter(
    (workspace) => !isStagingEnvironment(workspace.environment),
  );

  return (
    <div className="flex min-h-[100dvh] w-full flex-col">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pb-16 pt-20 sm:pt-28">
        {error ? (
          <PageHeader
            icon={OfficeBuilding}
            title="Unable to load workspaces"
            description="Something went wrong while fetching your workspaces. Please refresh the page to try again."
          />
        ) : !visibleWorkspaces ? (
          <WorkspaceListSkeleton />
        ) : visibleWorkspaces.length > 0 ? (
          <WorkspaceList workspaces={visibleWorkspaces} />
        ) : (
          <NoWorkspaces />
        )}
      </div>
      <div className="w-full md:hidden">
        <SignedInHint />
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
  const { AddWorkspaceModal, setShowAddWorkspaceModal } =
    useAddWorkspaceModal();

  // Must start as "" (not undefined) – cmdk only calls onValueChange in controlled mode
  const [selectedSlug, setSelectedSlug] = useState("");

  return (
    <div className="animate-slide-up-fade">
      <AddWorkspaceModal />
      <PageHeader
        icon={OfficeBuilding}
        title="Your workspaces"
        description="Choose a workspace to continue"
      />

      <Command
        loop
        value={selectedSlug}
        onValueChange={setSelectedSlug}
        filter={(value, search, keywords) => {
          const query = search.trim().toLowerCase();
          return [value, ...(keywords ?? [])].some((v) =>
            v.toLowerCase().includes(query),
          )
            ? 1
            : 0;
        }}
        // Handled here instead of Command.Item's onSelect, which also fires on click and would
        // navigate twice (and break cmd/middle-click to open in a new tab)
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing && selectedSlug) {
            e.preventDefault();
            router.push(`/${selectedSlug}`);
          }
        }}
        className="outline-none"
      >
        <div className="relative mt-8">
          <Magnifier className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Command.Input
            aria-label="Search workspaces"
            placeholder="Find workspace..."
            autoFocus={!isMobile}
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "block h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3.5 text-base text-neutral-900 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] duration-150 sm:text-sm",
              "placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-200/60",
            )}
          />
        </div>

        {/* Items must be direct children of the list (cmdk reorders them when filtering), so the layout goes on its inner sizer */}
        <Command.List className="mt-3 outline-none [&_[cmdk-list-sizer]]:flex [&_[cmdk-list-sizer]]:flex-col [&_[cmdk-list-sizer]]:gap-0.5">
          {workspaces.map((workspace) => (
            <WorkspaceRow
              key={workspace.id}
              workspace={workspace}
              onFocus={() => setSelectedSlug(workspace.slug)}
            />
          ))}
          <NoResults />
        </Command.List>
      </Command>

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
  workspace: { id, name, slug, logo, plan, disabledAt },
  onFocus,
}: {
  workspace: WorkspaceProps;
  onFocus: () => void;
}) {
  return (
    <Command.Item asChild value={slug} keywords={[name]}>
      <Link
        href={`/${slug}`}
        onFocus={onFocus}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-75",
          "active:!bg-neutral-200/60 data-[selected=true]:bg-neutral-100",
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
        <ChevronRight className="size-3 shrink-0 -translate-x-1 text-neutral-400 opacity-0 transition-[opacity,transform] duration-150 group-data-[selected=true]:translate-x-0 group-data-[selected=true]:opacity-100" />
      </Link>
    </Command.Item>
  );
}

function NoResults() {
  const search = useCommandState((state) => state.search.trim());
  const isEmpty = useCommandState((state) => state.filtered.count === 0);

  if (!search || !isEmpty) return null;

  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <p className="text-sm font-medium text-neutral-900">
        No workspaces found
      </p>
      <p className="mt-1 max-w-full truncate text-sm text-neutral-500">
        No workspaces match &ldquo;{search}&rdquo;
      </p>
    </div>
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

      <button
        type="button"
        onClick={() => setShowDeleteAccountModal(true)}
        className={cn(
          "mx-auto mt-3 block rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-400 transition-colors duration-75",
          "hover:bg-red-50 hover:text-red-600 active:bg-red-100",
          "outline-none focus-visible:ring-2 focus-visible:ring-red-500/50",
        )}
      >
        Delete account
      </button>
    </div>
  );
}
