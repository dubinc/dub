"use client";

import { useProgramApplicationsFilters } from "@/lib/program-applications/hooks/use-program-applications-filters";
import useWorkspace from "@/lib/swr/use-workspace";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import {
  AnimatedSizeContainer,
  Button,
  Filter,
  LinesY,
  useMediaQuery,
  useRouterStuff,
} from "@dub/ui";
import { ProgramApplicationStatus } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ApplicationsMenuPopover } from "./applications-menu-popover";
import { ApplicationsNav } from "./applications-nav";

export function ApplicationsShell({ children }: { children: ReactNode }) {
  const { slug } = useWorkspace();
  const { getQueryString } = useRouterStuff();
  const { isMobile } = useMediaQuery();
  const status = useApplicationStatus();

  const {
    filters,
    activeFilters,
    onSelect,
    onRemove,
    onRemoveFilter,
    onRemoveAll,
    onToggleOperator,
    setSelectedFilter,
    setSearch,
  } = useProgramApplicationsFilters({
    status,
    enabledFilters: ["groupId", "country"],
  });

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div>
        <div className="flex w-full flex-col items-center gap-2 min-[550px]:flex-row min-[550px]:items-center">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
            onRemoveFilter={onRemoveFilter}
            onSearchChange={setSearch}
            onSelectedFilterChange={setSelectedFilter}
          />
          <div className="flex w-full grow items-center gap-2 md:w-auto">
            <div className="min-w-0 flex-1">
              <SearchBoxPersisted
                placeholder="Search by name, email, or company"
                inputClassName="w-full md:w-80"
              />
            </div>
            <div className="flex shrink-0 justify-end gap-2">
              <Link
                href={`/${slug}/program/analytics/applications${getQueryString(
                  undefined,
                  { include: ["country"] },
                )}`}
              >
                <Button
                  variant="secondary"
                  className="w-fit"
                  icon={<LinesY className="h-4 w-4 text-neutral-600" />}
                  text={isMobile ? undefined : "View Analytics"}
                />
              </Link>
              <ApplicationsMenuPopover />
            </div>
          </div>
        </div>
        <AnimatedSizeContainer height>
          <div>
            {activeFilters.length > 0 && (
              <div className="pt-3">
                <Filter.List
                  filters={filters}
                  activeFilters={activeFilters}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onRemoveFilter={onRemoveFilter}
                  onRemoveAll={onRemoveAll}
                  onToggleOperator={onToggleOperator}
                />
              </div>
            )}
          </div>
        </AnimatedSizeContainer>
      </div>

      <div className="border-border-subtle overflow-clip rounded-xl border bg-neutral-100">
        <ApplicationsNav />
        <div className="border-border-subtle -mx-px -mb-px overflow-clip rounded-xl border bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}

function useApplicationStatus(): ProgramApplicationStatus {
  const pathname = usePathname();

  if (pathname.endsWith(`/${ProgramApplicationStatus.approved}`)) {
    return ProgramApplicationStatus.approved;
  }

  if (pathname.endsWith(`/${ProgramApplicationStatus.rejected}`)) {
    return ProgramApplicationStatus.rejected;
  }

  return ProgramApplicationStatus.pending;
}
