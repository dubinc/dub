"use client";

import { deleteProgramInviteAction } from "@/lib/actions/partners/delete-program-invite";
import { resendProgramInviteAction } from "@/lib/actions/partners/resend-program-invite";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartner from "@/lib/swr/use-partner";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { useArchivePartnerModal } from "@/ui/modals/archive-partner-modal";
import { useBanPartnerModal } from "@/ui/modals/ban-partner-modal";
import { useDeactivatePartnerModal } from "@/ui/modals/deactivate-partner-modal";
import { useReactivatePartnerModal } from "@/ui/modals/reactivate-partner-modal";
import { useUnbanPartnerModal } from "@/ui/modals/unban-partner-modal";
import { usePartnerAdvancedSettingsModal } from "@/ui/partners/partner-advanced-settings-modal";
import { PartnerInfoCards } from "@/ui/partners/partner-info-cards";
import { PartnerSelector } from "@/ui/partners/partner-selector";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, MenuItem, Popover, useKeyboardShortcut } from "@dub/ui";
import {
  BoxArchive,
  ChevronRight,
  CircleXmark,
  EnvelopeArrowRight,
  InvoiceDollar,
  LoadingSpinner,
  Msgs,
  PenWriting,
  Refresh2,
  Trash,
  UserCheck,
  UserDelete,
  Users,
} from "@dub/ui/icons";
import { LockOpen } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import {
  redirect,
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ReactNode, useState } from "react";
import { toast } from "sonner";
import { useCreateClawbackSheet } from "../../commissions/create-clawback-sheet";
import { useCreateCommissionSheet } from "../../commissions/create-commission-sheet";
import { PartnerNav } from "./partner-nav";
import { PartnerStats } from "./partner-stats";

export default function ProgramPartnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { slug: workspaceSlug } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params = useParams() as { slug: string; partnerId: string };
  const { partner, error: partnerError } = usePartner({
    partnerId: params.partnerId,
  });

  if (partnerError && partnerError.status === 404) {
    redirect(`/${workspaceSlug}/program/partners`);
  }

  const switchToPartner = (newPartnerId: string) => {
    if (params.partnerId === newPartnerId) return;
    const url = `${pathname.replace(`/partners/${params.partnerId}`, `/partners/${newPartnerId}`)}?${searchParams.toString()}`;
    router.push(url);
  };

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
          <PartnerSelector
            variant="header"
            selectedPartnerId={partner?.id ?? null}
            setSelectedPartnerId={switchToPartner}
          />
        </div>
      }
      controls={<>{partner && <PageControls partner={partner} />}</>}
    >
      <PageWidthWrapper className="pb-10">
        <PartnerStats partner={partner} error={Boolean(partnerError)} />
        <div className="@3xl/page:grid-cols-[minmax(440px,1fr)_minmax(0,360px)] mt-6 grid grid-cols-1 gap-x-6 gap-y-4">
          <div className="@3xl/page:order-2">
            <PartnerInfoCards partner={partner} hideStatuses={["approved"]} />
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
  const { slug: workspaceSlug, id: workspaceId } = useWorkspace();
  const router = useRouter();

  const { createCommissionSheet, setIsOpen: setCreateCommissionSheetOpen } =
    useCreateCommissionSheet({
      nested: true,
    });

  useKeyboardShortcut("c", () => setCreateCommissionSheetOpen(true));

  const { createClawbackSheet, setIsOpen: setClawbackSheetOpen } =
    useCreateClawbackSheet({});

  const [isOpen, setIsOpen] = useState(false);

  const { executeAsync: resendInvite, isPending: isResendingInvite } =
    useAction(resendProgramInviteAction, {
      onSuccess: async () => {
        toast.success("Resent the partner invite.");
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  const { executeAsync: deleteInvite, isPending: isDeletingInvite } = useAction(
    deleteProgramInviteAction,
    {
      onSuccess: async () => {
        await mutatePrefix("/api/partners");
        setIsOpen(false);
        toast.success("Deleted the partner invite.");
        router.push(`/${workspaceSlug}/program/partners?status=invited`);
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    },
  );

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
  const { DeactivatePartnerModal, setShowDeactivatePartnerModal } =
    useDeactivatePartnerModal({
      partner,
    });
  const { ReactivatePartnerModal, setShowReactivatePartnerModal } =
    useReactivatePartnerModal({
      partner,
    });
  const { ArchivePartnerModal, setShowArchivePartnerModal } =
    useArchivePartnerModal({
      partner,
    });

  return (
    <>
      {createCommissionSheet}
      {createClawbackSheet}
      <PartnerAdvancedSettingsModal />
      <BanPartnerModal />
      <UnbanPartnerModal />
      <DeactivatePartnerModal />
      <ReactivatePartnerModal />
      <ArchivePartnerModal />

      {partner.status === "invited" ? (
        <Button
          variant="primary"
          text="Resend invite"
          icon={
            isResendingInvite ? (
              <LoadingSpinner className="size-4 shrink-0" />
            ) : (
              <EnvelopeArrowRight className="size-4 shrink-0" />
            )
          }
          loading={isResendingInvite}
          onClick={async () => {
            if (partner.status !== "invited" || !workspaceId) {
              return;
            }
            await resendInvite({
              workspaceId,
              partnerId: partner.id,
            });
          }}
          className="hidden h-8 w-fit px-3 sm:h-9 md:flex"
        />
      ) : (
        <>
          <Button
            variant="primary"
            text="Create commission"
            shortcut="C"
            onClick={() => setCreateCommissionSheetOpen(true)}
            className="hidden h-8 w-fit px-3 sm:h-9 md:flex"
          />

          <Link href={`/${workspaceSlug}/program/messages/${partner.id}`}>
            <Button
              variant="secondary"
              text="Message"
              icon={<Msgs className="size-4 shrink-0" />}
              onClick={() => setIsOpen(false)}
              className="hidden h-8 w-fit px-3 sm:h-9 md:flex"
            />
          </Link>
        </>
      )}

      <Popover
        openPopover={isOpen}
        setOpenPopover={setIsOpen}
        content={
          <div className="grid w-full grid-cols-1 gap-px p-2 md:w-48">
            {partner.status === "invited" ? (
              <MenuItem
                icon={isDeletingInvite ? LoadingSpinner : Trash}
                onClick={async () => {
                  if (partner.status !== "invited" || !workspaceId) {
                    return;
                  }
                  if (
                    !window.confirm(
                      "Are you sure you want to delete this invite? This action cannot be undone.",
                    )
                  ) {
                    return;
                  }

                  await deleteInvite({
                    workspaceId,
                    partnerId: partner.id,
                  });
                }}
                variant="danger"
              >
                Delete invite
              </MenuItem>
            ) : (
              <>
                <MenuItem
                  as={Link}
                  href={`/${workspaceSlug}/program/messages/${partner.id}`}
                  target="_blank"
                  icon={Msgs}
                  onClick={() => setIsOpen(false)}
                  className="md:hidden"
                >
                  Message
                </MenuItem>
                <MenuItem
                  icon={InvoiceDollar}
                  onClick={() => {
                    setCreateCommissionSheetOpen(true);
                    setIsOpen(false);
                  }}
                  className="md:hidden"
                >
                  Create commission
                </MenuItem>
                <MenuItem
                  icon={Refresh2}
                  onClick={() => {
                    setClawbackSheetOpen(true);
                    setIsOpen(false);
                  }}
                >
                  Create clawback
                </MenuItem>
                <MenuItem
                  icon={PenWriting}
                  onClick={() => {
                    setShowPartnerAdvancedSettingsModal(true);
                    setIsOpen(false);
                  }}
                >
                  Advanced settings
                </MenuItem>
                {!["banned", "deactivated"].includes(partner.status) && (
                  <MenuItem
                    icon={BoxArchive}
                    onClick={() => {
                      setShowArchivePartnerModal(true);
                      setIsOpen(false);
                    }}
                  >
                    {partner.status === "archived" ? "Unarchive" : "Archive"}{" "}
                    partner
                  </MenuItem>
                )}
                {partner.status === "deactivated" ? (
                  <MenuItem
                    icon={LockOpen}
                    onClick={() => {
                      setShowReactivatePartnerModal(true);
                      setIsOpen(false);
                    }}
                  >
                    Reactivate partner
                  </MenuItem>
                ) : partner.status !== "banned" ? (
                  <MenuItem
                    icon={CircleXmark}
                    onClick={() => {
                      setShowDeactivatePartnerModal(true);
                      setIsOpen(false);
                    }}
                  >
                    Deactivate partner
                  </MenuItem>
                ) : null}
                {partner.status === "banned" ? (
                  <MenuItem
                    icon={UserCheck}
                    onClick={() => {
                      setShowUnbanPartnerModal(true);
                      setIsOpen(false);
                    }}
                  >
                    Unban partner
                  </MenuItem>
                ) : (
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
                )}
              </>
            )}
          </div>
        }
        align="end"
      >
        <Button
          type="button"
          variant="secondary"
          icon={<ThreeDots className="size-4 text-neutral-500" />}
          className="h-8 w-auto px-1.5 sm:h-9"
        />
      </Popover>
    </>
  );
}
