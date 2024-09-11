import { clientAccessCheck } from "@/lib/api/tokens/permissions";
import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  DomainProps,
  DomainVerificationStatusProps,
  LinkProps,
} from "@/lib/types";
import { CheckCircleFill, Delete, ThreeDots } from "@/ui/shared/icons";
import {
  Button,
  CircleCheck,
  Copy,
  NumberTooltip,
  Popover,
  Refresh2,
  StatusBadge,
  Tooltip,
  useInViewport,
  useMediaQuery,
  Wordmark,
} from "@dub/ui";
import {
  CursorRays,
  Flag2,
  Gear,
  Globe,
  Hyperlink,
  PenWriting,
} from "@dub/ui/src/icons";
import { cn, DEFAULT_LINK_PROPS, fetcher, nFormatter } from "@dub/utils";
import { motion } from "framer-motion";
import { Archive, ChevronDown, FolderInput, QrCode } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { useAddEditDomainModal } from "../modals/add-edit-domain-modal";
import { useAddEditLinkModal } from "../modals/add-edit-link-modal";
import { useArchiveDomainModal } from "../modals/archive-domain-modal";
import { useDeleteDomainModal } from "../modals/delete-domain-modal";
import { useLinkQRModal } from "../modals/link-qr-modal";
import { usePrimaryDomainModal } from "../modals/primary-domain-modal";
import { useTransferDomainModal } from "../modals/transfer-domain-modal";
import { DomainCardTitleColumn } from "./domain-card-title-column";
import DomainConfiguration from "./domain-configuration";

export default function DomainCard({ props }: { props: DomainProps }) {
  const { slug: domain, primary, registeredDomain } = props || {};

  const isDubProvisioned = !!registeredDomain;

  const { id: workspaceId, slug } = useWorkspace();

  const domainRef = useRef<HTMLDivElement>(null);
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

  const { data: linkProps } = useSWRImmutable<LinkProps>(
    workspaceId &&
      isVisible &&
      `/api/links/info?${new URLSearchParams({ workspaceId, domain, key: "_root" }).toString()}`,
    fetcher,
  );

  const { data: totalEvents } = useSWR<{ clicks: number }>(
    workspaceId &&
      isVisible &&
      linkProps &&
      `/api/analytics?event=clicks&workspaceId=${workspaceId}&domain=${domain}&key=_root&interval=all_unfiltered`,
    fetcher,
    {
      dedupingInterval: 15000,
    },
  );

  const [showDetails, setShowDetails] = useState(false);
  const [groupHover, setGroupHover] = useState(false);

  const isInvalid =
    data &&
    !["Valid Configuration", "Pending Verification"].includes(data.status);

  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "active";

  return (
    <>
      <div
        ref={domainRef}
        className="hover:drop-shadow-card-hover group rounded-xl border border-gray-200 bg-white transition-[filter]"
        onPointerEnter={() => setGroupHover(true)}
        onPointerLeave={() => setGroupHover(false)}
      >
        {isDubProvisioned && (
          <div className="flex items-center justify-between gap-2 rounded-t-xl border-b border-gray-100 bg-gray-50 px-5 py-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Wordmark className="h-4" />
              <span className="font-medium text-gray-900">
                Provisioned by Dub
              </span>
            </div>
            <a
              href="https://dub.co/help/article/how-to-add-custom-domain" // TODO: Update link
              target="_blank"
              className="text-gray-500 underline transition-colors hover:text-gray-800"
            >
              Learn more
            </a>
          </div>
        )}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-[1.5fr_1fr] items-center gap-3 sm:grid-cols-[3fr_1fr_1.5fr] sm:gap-4 md:grid-cols-[2fr_1fr_0.5fr_1.5fr]">
            <DomainCardTitleColumn
              domain={domain}
              icon={tab === "active" ? Globe : Archive}
              url={linkProps?.url}
              primary={primary}
            />

            {/* Clicks */}
            <div className="hidden md:flex">
              {totalEvents ? (
                <NumberTooltip value={totalEvents?.clicks}>
                  <Link
                    href={`/${slug}/analytics?domain=${domain}&key=_root`}
                    className="flex items-center space-x-1 whitespace-nowrap rounded-md border border-gray-200 bg-gray-50 px-3 py-1 transition-colors hover:bg-gray-100"
                  >
                    <CursorRays className="h-4 w-4 text-gray-700" />
                    <p className="text-xs font-medium text-gray-900">
                      {nFormatter(totalEvents?.clicks)}
                      <span className="ml-1 hidden sm:inline-block">
                        clicks
                      </span>
                    </p>
                  </Link>
                </NumberTooltip>
              ) : (
                <div className="h-6 w-16 animate-pulse rounded-md bg-gray-200" />
              )}
            </div>

            {/* Status */}
            <div className="hidden sm:block">
              {data ? (
                <StatusBadge
                  variant={
                    data.status === "Valid Configuration"
                      ? "success"
                      : data.status === "Pending Verification" ||
                          isDubProvisioned
                        ? "pending"
                        : "error"
                  }
                  onClick={
                    isDubProvisioned
                      ? undefined
                      : () => setShowDetails((s) => !s)
                  }
                >
                  {data.status === "Valid Configuration"
                    ? "Active"
                    : data.status === "Pending Verification"
                      ? "Pending"
                      : isDubProvisioned
                        ? "Provisioning"
                        : "Invalid"}
                </StatusBadge>
              ) : (
                <div className="h-6 w-16 animate-pulse rounded-md bg-gray-200" />
              )}
            </div>

            <div className="flex justify-end gap-2 sm:gap-3">
              {!isDubProvisioned && (
                <Button
                  icon={
                    <div className="flex items-center gap-1">
                      <div className="relative">
                        <Gear
                          className={cn(
                            "h-4 w-4",
                            showDetails ? "text-gray-800" : "text-gray-600",
                          )}
                        />
                        {/* Error indicator */}
                        {data && isInvalid && (
                          <div className="absolute -right-px -top-px h-[5px] w-[5px] rounded-full bg-red-500">
                            <div className="h-full w-full animate-pulse rounded-full ring-2 ring-red-500/30" />
                          </div>
                        )}
                      </div>
                      <ChevronDown
                        className={cn(
                          "hidden h-4 w-4 text-gray-400 transition-transform sm:block",
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
              )}
              <Menu
                props={props}
                linkProps={linkProps}
                refreshProps={{ isValidating, mutate }}
                groupHover={groupHover}
              />
            </div>
          </div>
          <motion.div
            initial={false}
            animate={{ height: showDetails ? "auto" : 0 }}
            className="overflow-hidden"
          >
            {data ? (
              data.status === "Valid Configuration" ? (
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
                <DomainConfiguration data={data} />
              )
            ) : (
              <div className="mt-6 h-6 w-32 animate-pulse rounded-md bg-gray-200" />
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}

function Menu({
  props,
  linkProps,
  refreshProps,
  groupHover,
}: {
  props: DomainProps;
  linkProps?: LinkProps;
  refreshProps: {
    isValidating: boolean;
    mutate: () => void;
  };
  groupHover: boolean;
}) {
  const { primary, archived, slug: domain, registeredDomain } = props;
  const isDubProvisioned = !!registeredDomain;

  const { isMobile } = useMediaQuery();

  const { role } = useWorkspace();
  const permissionsError = clientAccessCheck({
    action: "domains.write",
    role,
  }).error;

  const { activeWorkspaceDomains } = useDomains();

  const [openPopover, setOpenPopover] = useState(false);

  const { setShowAddEditDomainModal, AddEditDomainModal } =
    useAddEditDomainModal({
      props,
    });

  const { setShowTransferDomainModal, TransferDomainModal } =
    useTransferDomainModal({
      props,
    });

  const { setShowPrimaryDomainModal, PrimaryDomainModal } =
    usePrimaryDomainModal({
      props,
    });

  const { setShowArchiveDomainModal, ArchiveDomainModal } =
    useArchiveDomainModal({
      props,
    });

  const { setShowDeleteDomainModal, DeleteDomainModal } = useDeleteDomainModal({
    props,
  });

  const { setShowAddEditLinkModal, AddEditLinkModal } = useAddEditLinkModal({
    props: linkProps || { ...DEFAULT_LINK_PROPS, key: "_root", domain },
  });

  const { setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props: linkProps || DEFAULT_LINK_PROPS,
  });

  const [copiedLinkId, setCopiedLinkId] = useState(false);

  const copyLinkId = () => {
    if (!linkProps) {
      toast.error("Link ID not found");
      return;
    }
    navigator.clipboard.writeText(linkProps.id);
    setCopiedLinkId(true);
    toast.success("Link ID copied!");
    setTimeout(() => setCopiedLinkId(false), 3000);
  };

  const activeDomainsCount = activeWorkspaceDomains?.length || 0;

  return (
    <>
      <AddEditLinkModal />
      <LinkQRModal />
      <AddEditDomainModal />
      <PrimaryDomainModal />
      <ArchiveDomainModal />
      <DeleteDomainModal />
      <TransferDomainModal />

      <motion.div
        animate={{
          width: groupHover && !isMobile ? "auto" : isMobile ? 79 : 39,
        }}
        initial={false}
        className="flex items-center justify-end divide-x divide-gray-200 overflow-hidden rounded-md border border-gray-200 sm:divide-transparent sm:group-hover:divide-gray-200"
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
                  refreshProps.isValidating && "animate-spin text-gray-500",
                )}
              />
            }
            variant="outline"
            className="h-8 rounded-none border-0 px-3 text-gray-600"
            onClick={() => refreshProps.mutate()}
          />
        </Tooltip>
        <Popover
          content={
            <div className="w-full sm:w-48">
              <div className="grid gap-px p-2">
                <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-gray-500">
                  Link Settings
                </p>
                <Button
                  text="Edit Link"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowAddEditLinkModal(true);
                  }}
                  icon={<Hyperlink className="h-4 w-4" />}
                  disabledTooltip={
                    !linkProps ? "Retrieving link details..." : undefined
                  }
                  className="h-9 justify-start px-2 font-medium"
                />
                <Button
                  text="QR Code"
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowLinkQRModal(true);
                  }}
                  icon={<QrCode className="h-4 w-4" />}
                  disabledTooltip={
                    !linkProps ? "Retrieving link details..." : undefined
                  }
                  className="h-9 justify-start px-2 font-medium"
                />
                <Button
                  text="Copy Link ID"
                  variant="outline"
                  onClick={() => copyLinkId()}
                  icon={
                    copiedLinkId ? (
                      <CheckCircleFill className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )
                  }
                  disabledTooltip={
                    !linkProps ? "Retrieving link details..." : undefined
                  }
                  className="h-9 justify-start px-2 font-medium"
                />
              </div>
              <div className="border-t border-gray-200" />
              <div className="grid gap-px p-2">
                <p className="mb-1.5 mt-1 flex items-center gap-2 px-1 text-xs font-medium text-gray-500">
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
                {!primary && (
                  <Button
                    text="Set as Primary"
                    variant="outline"
                    onClick={() => {
                      setOpenPopover(false);
                      setShowPrimaryDomainModal(true);
                    }}
                    icon={<Flag2 className="h-4 w-4" />}
                    className="h-9 justify-start px-2 font-medium"
                  />
                )}
                {!isDubProvisioned && (
                  <Button
                    text="Transfer"
                    variant="outline"
                    onClick={() => {
                      setOpenPopover(false);
                      setShowTransferDomainModal(true);
                    }}
                    icon={<FolderInput className="h-4 w-4" />}
                    className="h-9 justify-start px-2 font-medium"
                    disabledTooltip={
                      primary && activeDomainsCount > 1
                        ? "You cannot transfer your workspace's primary domain. Set another domain as primary to transfer this domain."
                        : undefined
                    }
                  />
                )}
                <Button
                  text={archived ? "Unarchive" : "Archive"}
                  variant="outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowArchiveDomainModal(true);
                  }}
                  icon={<Archive className="h-4 w-4" />}
                  className="h-9 justify-start px-2 font-medium"
                />
                <Button
                  text="Delete"
                  variant="danger-outline"
                  onClick={() => {
                    setOpenPopover(false);
                    setShowDeleteDomainModal(true);
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
