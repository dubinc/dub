"use client";

import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useDomains from "@/lib/swr/use-domains";
import useDomainsCount from "@/lib/swr/use-domains-count";
import useWorkspace from "@/lib/swr/use-workspace";
import DomainCard from "@/ui/domains/domain-card";
import DomainCardPlaceholder from "@/ui/domains/domain-card-placeholder";
import { FreeDotLinkBanner } from "@/ui/domains/free-dot-link-banner";
import { useAddEditDomainModal } from "@/ui/modals/add-edit-domain-modal";
import { useRegisterDomainModal } from "@/ui/modals/register-domain-modal";
import { useRegisterDomainSuccessModal } from "@/ui/modals/register-domain-success-modal";
import EmptyState from "@/ui/shared/empty-state";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { PaginationControls } from "@dub/blocks/src/pagination-controls";
import {
  Badge,
  Button,
  Globe,
  Popover,
  usePagination,
  useRouterStuff,
} from "@dub/ui";
import { LinkBroken } from "@dub/ui/src/icons";
import { ToggleGroup } from "@dub/ui/src/toggle-group";
import { InfoTooltip, TooltipContent } from "@dub/ui/src/tooltip";
import { capitalize } from "@dub/utils";
import { ChevronDown, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { DefaultDomains } from "./default-domains";

export default function WorkspaceDomainsClient() {
  const {
    id: workspaceId,
    plan,
    nextPlan,
    role,
    domainsLimit,
    exceededDomains,
    dotLinkClaimed,
  } = useWorkspace();

  const [openPopover, setOpenPopover] = useState(false);
  const { searchParams, queryParams } = useRouterStuff();
  const { allWorkspaceDomains, loading } = useDomains({ includeParams: true });
  const { data: domainsCount } = useDomainsCount();

  const { pagination, setPagination } = usePagination(50);

  const archived = searchParams.get("archived");
  const search = searchParams.get("search");

  const { AddEditDomainModal, AddDomainButton, setShowAddEditDomainModal } =
    useAddEditDomainModal({
      buttonProps: {
        className: "h-9 rounded-lg",
      },
    });

  const { RegisterDomainModal, setShowRegisterDomainModal } =
    useRegisterDomainModal();

  const { RegisterDomainSuccessModal, setShowRegisterDomainSuccessModal } =
    useRegisterDomainSuccessModal();

  useEffect(
    () => setShowRegisterDomainSuccessModal(searchParams.has("registered")),
    [searchParams],
  );

  const { error: permissionsError } = clientAccessCheck({
    action: "domains.write",
    role,
  });

  const disabledTooltip = exceededDomains ? (
    <TooltipContent
      title={`You can only add up to ${domainsLimit} domain${
        domainsLimit === 1 ? "" : "s"
      } on the ${capitalize(plan)} plan. Upgrade to add more domains`}
      cta="Upgrade"
      onClick={() => {
        queryParams({
          set: {
            upgrade: nextPlan.name.toLowerCase(),
          },
        });
      }}
    />
  ) : (
    permissionsError || undefined
  );

  return (
    <>
      <RegisterDomainSuccessModal />
      <div className="grid gap-5">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="flex items-center gap-x-2">
            <h1 className="text-2xl font-semibold tracking-tight text-black">
              Domains
            </h1>
            <InfoTooltip
              content={
                <TooltipContent
                  title="Learn more about how to add, configure, and verify custom domains on Dub."
                  href="https://dub.co/help/article/how-to-add-custom-domain"
                  target="_blank"
                  cta="Learn more"
                />
              }
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="w-full sm:w-auto">
              <SearchBoxPersisted
                loading={loading}
                onChangeDebounced={(t) => {
                  if (t) {
                    queryParams({ set: { search: t }, del: "page" });
                  } else {
                    queryParams({ del: "search" });
                  }
                }}
              />
            </div>
            <ToggleGroup
              options={[
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived" },
              ]}
              selected={archived ? "archived" : "active"}
              selectAction={(id) =>
                id === "active"
                  ? queryParams({ del: ["archived", "page"] })
                  : queryParams({ set: { archived: "true" }, del: "page" })
              }
            />

            <Popover
              content={
                <div className="grid w-screen gap-px p-2 sm:w-fit sm:min-w-[17rem]">
                  <Button
                    text="Connect a domain you own"
                    variant="outline"
                    icon={<Globe className="h-4 w-4" />}
                    className="h-9 justify-start px-2 text-gray-800"
                    onClick={() => setShowAddEditDomainModal(true)}
                  />
                  <Button
                    text={
                      <div className="flex items-center gap-3">
                        Claim free .link domain
                        {plan === "free" ? (
                          <Badge
                            variant="neutral"
                            className="flex items-center gap-1"
                          >
                            <Crown className="size-3" />
                            <span className="uppercase">Pro</span>
                          </Badge>
                        ) : dotLinkClaimed ? (
                          <span className="rounded-md border border-green-200 bg-green-500/10 px-1 py-0.5 text-xs text-green-900">
                            Claimed
                          </span>
                        ) : null}
                      </div>
                    }
                    variant="outline"
                    icon={<LinkBroken className="size-4" />}
                    className="h-9 justify-start px-2 text-gray-800 disabled:border-none disabled:bg-transparent disabled:text-gray-500"
                    onClick={() => setShowRegisterDomainModal(true)}
                    disabled={dotLinkClaimed}
                  />
                </div>
              }
              align="end"
              openPopover={openPopover}
              setOpenPopover={setOpenPopover}
            >
              <Button
                variant="primary"
                className="w-fit"
                text={
                  <div className="flex items-center gap-2">
                    Add domain{" "}
                    <ChevronDown className="size-4 transition-transform duration-75 group-data-[state=open]:rotate-180" />
                  </div>
                }
                onClick={() => setOpenPopover(!openPopover)}
                disabledTooltip={disabledTooltip}
              />
            </Popover>
          </div>
        </div>

        {workspaceId && (
          <>
            <AddEditDomainModal />
            <RegisterDomainModal />
          </>
        )}

        {!dotLinkClaimed && <FreeDotLinkBanner />}

        <div key={archived} className="animate-fade-in">
          {!loading ? (
            allWorkspaceDomains.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3">
                {allWorkspaceDomains.map((domain) => (
                  <li key={domain.slug}>
                    <DomainCard props={domain} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-200 py-10">
                <EmptyState
                  icon={Globe}
                  title={
                    archived
                      ? "No archived domains found for this workspace"
                      : search
                        ? "No custom domains found"
                        : "No custom domains found for this workspace"
                  }
                />
                <AddDomainButton />
              </div>
            )
          ) : (
            <ul className="grid grid-cols-1 gap-3">
              {Array.from({ length: 10 }).map((_, idx) => (
                <li key={idx}>
                  <DomainCardPlaceholder />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="sticky bottom-0 rounded-b-[inherit] border-t border-gray-200 bg-white px-3.5 py-2">
          <PaginationControls
            pagination={pagination}
            setPagination={setPagination}
            totalCount={domainsCount || 0}
            unit={(p) => `domain${p ? "s" : ""}`}
          />
        </div>
      </div>

      <DefaultDomains />
    </>
  );
}
