"use client";

import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useBanPartnerModal } from "@/ui/partners/ban-partner-modal";
import { usePartnerAdvancedSettingsModal } from "@/ui/partners/partner-advanced-settings-modal";
import { useUnbanPartnerModal } from "@/ui/partners/unban-partner-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, MenuItem, Popover, useKeyboardShortcut } from "@dub/ui";
import {
  ChevronRight,
  Pen2,
  UserCheck,
  UserDelete,
  Users,
} from "@dub/ui/icons";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ReactNode, useState } from "react";
import { useCreateCommissionSheet } from "../../commissions/create-commission-sheet";
import { PartnerInfo } from "./partner-info";
import { PartnerNav } from "./partner-nav";
import { PartnerStats } from "./partner-stats";

export default function ProgramPartnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { slug: workspaceSlug } = useWorkspace();

  const { partnerId } = useParams() as { partnerId: string };
  const {
    partner,
    loading: isPartnerLoading,
    error: partnerError,
  } = usePartner({
    partnerId,
  });

  return (
    <PageContent
      title={
        <div className="flex items-center gap-1.5">
          <Link
            href={`/${workspaceSlug}/program/partners`}
            aria-label="Back to groups"
            title="Back to groups"
            className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
          >
            <Users className="size-4" />
          </Link>
          <ChevronRight className="text-content-muted size-2.5 shrink-0 [&_*]:stroke-2" />
          {isPartnerLoading ? (
            <div className="h-7 w-32 animate-pulse rounded-md bg-neutral-200" />
          ) : (
            <span className="min-w-0 truncate text-lg font-semibold leading-7 text-neutral-900">
              {partner?.name ?? "-"}
            </span>
          )}
        </div>
      }
      controls={<>{partner && <PageControls partner={partner} />}</>}
    >
      <PageWidthWrapper>
        <PartnerStats partner={partner} error={Boolean(partnerError)} />
        <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] mt-6 grid grid-cols-1 gap-x-6 gap-y-4">
          <div className="@3xl/page:order-2">
            <PartnerInfo partner={partner} />
          </div>
          <div className="@3xl/page:order-1">
            <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
              <PartnerNav />
              <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
                {children}
              </div>
            </div>
          </div>
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}

function PageControls({ partner }: { partner: EnrolledPartnerProps }) {
  const { createCommissionSheet, setIsOpen: setCreateCommissionSheetOpen } =
    useCreateCommissionSheet({
      nested: true,
      partnerId: partner.id,
    });

  useKeyboardShortcut("c", () => setCreateCommissionSheetOpen(true));

  const [isOpen, setIsOpen] = useState(false);

  const { PartnerAdvancedSettingsModal, setShowPartnerAdvancedSettingsModal } =
    usePartnerAdvancedSettingsModal({
      partner,
    });
  const { BanPartnerModal, setShowBanPartnerModal } = useBanPartnerModal({
    partner,
  });
  const { UnbanPartnerModal, setShowUnbanPartnerModal } = useUnbanPartnerModal({
    partner,
  });

  return (
    <>
      {createCommissionSheet}
      <PartnerAdvancedSettingsModal />
      <BanPartnerModal />
      <UnbanPartnerModal />

      <Button
        variant="primary"
        text="Send commission"
        shortcut="C"
        onClick={() => setCreateCommissionSheetOpen(true)}
        className="hidden w-fit sm:flex"
      />

      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <div className="grid w-full grid-cols-1 gap-px p-2 md:w-48">
            <MenuItem
              icon={Pen2}
              onClick={() => {
                setCreateCommissionSheetOpen(true);
                setIsOpen(false);
              }}
              className="sm:hidden"
            >
              Send commission
            </MenuItem>
            <MenuItem
              icon={Pen2}
              onClick={() => {
                setShowPartnerAdvancedSettingsModal(true);
                setIsOpen(false);
              }}
            >
              Advanced settings
            </MenuItem>
            {partner.status !== "banned" ? (
              <MenuItem
                icon={UserDelete}
                variant="danger"
                onClick={() => {
                  setShowBanPartnerModal(true);
                  setIsOpen(false);
                }}
              >
                Ban partner
              </MenuItem>
            ) : (
              <MenuItem
                icon={UserCheck}
                onClick={() => {
                  setShowUnbanPartnerModal(true);
                  setIsOpen(false);
                }}
              >
                Unban partner
              </MenuItem>
            )}
          </div>
        }
        align="end"
      >
        <Button
          type="button"
          variant="secondary"
          icon={<ThreeDots className="size-5 text-neutral-500" />}
          className="w-fit px-1.5"
        />
      </Popover>
    </>
  );
}
