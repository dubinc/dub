import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainVerificationStatusProps, EmailDomainProps } from "@/lib/types";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import DomainConfiguration from "@/ui/domains/domain-configuration";
import { useAddEditEmailDomainModal } from "@/ui/modals/add-edit-email-domain";
import { Delete, ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  CircleCheck,
  Popover,
  Refresh2,
  StatusBadge,
  Tooltip,
  useInViewport,
  useMediaQuery,
} from "@dub/ui";
import { Gear, PenWriting } from "@dub/ui/icons";
import { cn, fetcher } from "@dub/utils";
import { motion } from "framer-motion";
import { ChevronDown, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import useSWRImmutable from "swr/immutable";

export function EmailDomainCard(domain: EmailDomainProps) {
  const searchParams = useSearchParams();
  const { id: workspaceId } = useWorkspace();
  const domainRef = useRef<HTMLDivElement>(null);
  const [groupHover, setGroupHover] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const isVisible = useInViewport(domainRef, { defaultValue: true });

  const { data, isValidating, mutate } = useSWRImmutable<{
    status: DomainVerificationStatusProps;
    response: any;
  }>(
    workspaceId &&
      isVisible &&
      `/api/domains/${domain}/verify?workspaceId=${workspaceId}`,
    fetcher,
  );

  const verificationData = useMemo(() => {
    if (domain.verified) {
      return {
        status: "Valid Configuration",
        response: null,
      } as {
        status: DomainVerificationStatusProps;
        response: any;
      };
    }

    return data;
  }, [domain.verified, data]);

  const isInvalid =
    verificationData &&
    !["Valid Configuration", "Pending Verification"].includes(
      verificationData.status,
    );

  return (
    <>
      <div
        ref={domainRef}
        className="hover:drop-shadow-card-hover group rounded-xl border border-neutral-200 bg-white transition-[filter]"
        onPointerEnter={() => setGroupHover(true)}
        onPointerLeave={() => setGroupHover(false)}
      >
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-[1.5fr_1fr] items-center gap-3 sm:grid-cols-[3fr_1fr_1.5fr] sm:gap-4 md:grid-cols-[2fr_1fr_0.5fr_1.5fr]">
            <DomainCardTitleColumn
              domain={domain.slug}
              icon={Mail}
              emailDomain={true}
            />

            <div className="hidden sm:block">
              {verificationData ? (
                <StatusBadge
                  variant={
                    verificationData.status === "Valid Configuration"
                      ? "success"
                      : verificationData.status === "Pending Verification" ||
                          verificationData.status === "Conflicting DNS Records"
                        ? "pending"
                        : "error"
                  }
                  onClick={() => setShowDetails((s) => !s)}
                >
                  {verificationData.status === "Valid Configuration"
                    ? "Active"
                    : verificationData.status === "Pending Verification"
                      ? "Pending"
                      : "Invalid"}
                </StatusBadge>
              ) : (
                <div className="h-6 w-16 animate-pulse rounded-md bg-neutral-200" />
              )}
            </div>

            <div className="gap-2 sm:gap-3 bg-red-100">
              <Button
                icon={
                  <div className="flex items-center gap-1">
                    <div className="relative">
                      <Gear
                        className={cn(
                          "h-4 w-4",
                          showDetails ? "text-neutral-800" : "text-neutral-600",
                        )}
                      />

                      {verificationData && isInvalid && (
                        <div className="absolute -right-px -top-px h-[5px] w-[5px] rounded-full bg-red-500">
                          <div className="h-full w-full animate-pulse rounded-full ring-2 ring-red-500/30" />
                        </div>
                      )}
                    </div>

                    <ChevronDown
                      className={cn(
                        "hidden h-4 w-4 text-neutral-400 transition-transform sm:block",
                        showDetails && "rotate-180",
                      )}
                    />
                  </div>
                }
                variant="secondary"
                className={cn(
                  "h-8 w-auto px-2.5 opacity-100 transition-opacity",
                  !showDetails &&
                    !isInvalid &&
                    "sm:opacity-0 sm:group-hover:opacity-100",
                )}
                onClick={() => setShowDetails((s) => !s)}
                data-state={showDetails ? "open" : "closed"}
              />

              {showDetails && (
                <Menu
                  props={domain}
                  refreshProps={{ isValidating, mutate }}
                  groupHover={groupHover}
                />
              )}
            </div>
          </div>

          <motion.div
            initial={false}
            animate={{ height: showDetails ? "auto" : 0 }}
            className="overflow-hidden"
          >
            {verificationData ? (
              verificationData.status === "Valid Configuration" ? (
                <div className="mt-6 flex items-center gap-2 text-pretty rounded-lg bg-green-100/80 p-3 text-sm text-green-600">
                  <CircleCheck className="h-5 w-5 shrink-0" />
                  <div>
                    Good news! Your DNS records are set up correctly, but it can
                    take some time for them to propagate globally.{" "}
                    <Link
                      href="https://dub.co/help/article/how-to-add-custom-domain#how-long-do-i-have-to-wait-for-my-domain-to-work"
                      target="_blank"
                      className="underline transition-colors hover:text-green-800"
                    >
                      Learn more.
                    </Link>
                  </div>
                </div>
              ) : (
                <DomainConfiguration data={verificationData} />
              )
            ) : (
              <div className="mt-6 h-6 w-32 animate-pulse rounded-md bg-neutral-200" />
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}

function Menu({
  props,
  refreshProps,
  groupHover,
}: {
  props: EmailDomainProps;
  refreshProps: {
    isValidating: boolean;
    mutate: () => void;
  };
  groupHover: boolean;
}) {
  const { role } = useWorkspace();
  const { isMobile } = useMediaQuery();
  const [openPopover, setOpenPopover] = useState(false);

  const permissionsError = clientAccessCheck({
    action: "domains.write",
    role,
  }).error;

  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditEmailDomainModal({ props });

  // const { setShowDeleteDomainModal, DeleteDomainModal } = useDeleteDomainModal({
  //   props,
  // });

  return (
    <>
      <AddEditDomainModal />
      {/* <DeleteDomainModal /> */}

      <motion.div
        animate={{
          width: groupHover && !isMobile ? "auto" : isMobile ? 79 : 39,
        }}
        initial={false}
        className="flex items-center justify-start divide-x divide-neutral-200 overflow-hidden rounded-md border border-neutral-200 sm:divide-transparent sm:group-hover:divide-neutral-200"
      >
        <Button
          icon={<PenWriting className={cn("h-4 w-4 shrink-0")} />}
          variant="outline"
          className="h-8 rounded-none border-0 px-3"
          onClick={() => setShowAddEditDomainModal(true)}
        />

        <Tooltip content="Refresh">
          <Button
            icon={
              <Refresh2
                className={cn(
                  "h-4 w-4 shrink-0 -scale-100 transition-colors [animation-duration:0.25s]",
                  refreshProps.isValidating && "animate-spin text-neutral-500",
                )}
              />
            }
            variant="outline"
            className="h-8 rounded-none border-0 px-3 text-neutral-600"
            onClick={() => refreshProps.mutate()}
          />
        </Tooltip>

        <Popover
          content={
            <div className="w-full sm:w-48">
              <div className="grid gap-px p-2">
                <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-neutral-500">
                  Domain Settings
                </p>

                <Button
                  text="Edit Domain"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowAddEditDomainModal(true);
                  }}
                  icon={<PenWriting className="h-4 w-4" />}
                  className="h-9 justify-start px-2 font-medium"
                />

                <Button
                  text="Delete"
                  variant="danger-outline"
                  onClick={() => {
                    setOpenPopover(false);
                    // setShowDeleteDomainModal(true);
                  }}
                  icon={<Delete className="h-4 w-4" />}
                  className="h-9 justify-start px-2 font-medium"
                />
              </div>
            </div>
          }
          align="end"
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
        >
          <Button
            variant="outline"
            className="h-8 rounded-none border-0 px-2 transition-[border-color] duration-200"
            icon={<ThreeDots className="h-5 w-5 shrink-0" />}
            onClick={() => {
              setOpenPopover(!openPopover);
            }}
            {...(permissionsError && {
              disabledTooltip: permissionsError,
            })}
          />
        </Popover>
      </motion.div>
    </>
  );
}
