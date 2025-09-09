"use client";

import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useBanPartnerModal } from "@/ui/partners/ban-partner-modal";
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
import { toast } from "sonner";
import { useCreateCommissionSheet } from "../../commissions/create-commission-sheet";

export default function ProgramPartnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { slug: workspaceSlug } = useWorkspace();

  const { partnerId } = useParams() as { partnerId: string };
  const { partner, loading: isPartnerLoading } = usePartner({
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
      controls={
        <>
          {partner && (
            <>
              <CreateCommissionButton partner={partner} />
              <PageMenu partner={partner} />
            </>
          )}
        </>
      }
    >
      <PageWidthWrapper>{children}</PageWidthWrapper>
    </PageContent>
  );
}

function CreateCommissionButton({
  partner,
}: {
  partner: EnrolledPartnerProps;
}) {
  const { createCommissionSheet, setIsOpen: setCreateCommissionSheetOpen } =
    useCreateCommissionSheet({
      nested: true,
      partnerId: partner.id,
    });

  useKeyboardShortcut("c", () => setCreateCommissionSheetOpen(true));

  return (
    <>
      {createCommissionSheet}
      <Button
        variant="primary"
        text="Send commission"
        shortcut="C"
        onClick={() => setCreateCommissionSheetOpen(true)}
        className="w-fit"
      />
    </>
  );
}

function PageMenu({ partner }: { partner: EnrolledPartnerProps }) {
  const [isOpen, setIsOpen] = useState(false);

  const { BanPartnerModal, setShowBanPartnerModal } = useBanPartnerModal({
    partner,
  });
  const { UnbanPartnerModal, setShowUnbanPartnerModal } = useUnbanPartnerModal({
    partner,
  });

  return (
    <>
      <BanPartnerModal />
      <UnbanPartnerModal />
      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <div className="grid w-full grid-cols-1 gap-px p-2 md:w-48">
            <MenuItem
              icon={Pen2}
              onClick={() => {
                toast.info("WIP");
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
