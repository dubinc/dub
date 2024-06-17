import useDomains from "@/lib/swr/use-domains";
import useWorkspace from "@/lib/swr/use-workspace";
import { DomainProps, DomainVerificationStatusProps } from "@/lib/types";
import {
  AlertCircleFill,
  Chart,
  CheckCircleFill,
  Delete,
  ExternalLink,
  ThreeDots,
  XCircleFill,
} from "@/ui/shared/icons";
import {
  Button,
  LoadingCircle,
  LoadingDots,
  NumberTooltip,
  Popover,
  SimpleTooltipContent,
  useIntersectionObserver,
} from "@dub/ui";
import {
  capitalize,
  fetcher,
  nFormatter,
  punycode,
  truncate,
} from "@dub/utils";
import { Archive, Edit3, FileCog, FolderInput, QrCode } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { useAddEditDomainModal } from "../modals/add-edit-domain-modal";
import { useArchiveDomainModal } from "../modals/archive-domain-modal";
import { useDeleteDomainModal } from "../modals/delete-domain-modal";
import { useLinkQRModal } from "../modals/link-qr-modal";
import { usePrimaryDomainModal } from "../modals/primary-domain-modal";
import { useTransferDomainModal } from "../modals/transfer-domain-modal";
import DomainConfiguration from "./domain-configuration";

export default function DomainCard({ props }: { props: DomainProps }) {
  const { id: workspaceId, slug } = useWorkspace();
  const { activeWorkspaceDomains } = useDomains();

  const { slug: domain, primary, target, type, archived } = props || {};

  const { setShowLinkQRModal, LinkQRModal } = useLinkQRModal({
    props: {
      domain,
      url: target,
    },
  });

  const domainRef = useRef<any>();
  const entry = useIntersectionObserver(domainRef, {});
  const isVisible = !!entry?.isIntersecting;

  const { data, isValidating, mutate } = useSWRImmutable<{
    status: DomainVerificationStatusProps;
    response: any;
  }>(
    workspaceId &&
      isVisible &&
      `/api/domains/${domain}/verify?workspaceId=${workspaceId}`,
    fetcher,
  );

  const { data: totalEvents } = useSWR<{ clicks: number }>(
    workspaceId &&
      `/api/analytics?event=clicks&workspaceId=${workspaceId}&domain=${domain}&key=_root&interval=all_unfiltered`,
    fetcher,
    {
      fallbackData: {
        clicks: props.clicks,
      },
      dedupingInterval: 15000,
    },
  );

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

  const activeDomainsCount = activeWorkspaceDomains?.length || 0;

  return (
    <>
      <AddEditDomainModal />
      <LinkQRModal />
      <PrimaryDomainModal />
      <ArchiveDomainModal />
      <DeleteDomainModal />
      <TransferDomainModal />
      <div
        ref={domainRef}
        className="flex flex-col space-y-3 rounded-lg border border-gray-200 bg-white px-5 py-8 sm:px-10"
      >
        <div className="flex flex-col justify-between space-y-4 sm:flex-row sm:space-x-4">
          <div className="flex items-center space-x-2">
            <a
              href={`http://${domain}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2"
            >
              <p className="flex items-center text-xl font-semibold">
                {punycode(domain)}
              </p>
              <ExternalLink className="h-5 w-5" />
            </a>
            <NumberTooltip value={totalEvents?.clicks}>
              <Link
                href={`/${slug}/analytics?domain=${domain}&key=_root`}
                className="flex items-center space-x-1 rounded-md bg-gray-100 px-2 py-0.5 transition-all duration-75 hover:scale-105 active:scale-100"
              >
                <Chart className="h-4 w-4" />
                <p className="text-sm">
                  {!totalEvents ? (
                    <LoadingDots />
                  ) : (
                    nFormatter(totalEvents?.clicks)
                  )}
                  <span className="ml-1 hidden sm:inline-block">clicks</span>
                </p>
              </Link>
            </NumberTooltip>
            {primary && (
              <span className="rounded-full bg-blue-500 px-3 py-0.5 text-xs text-white">
                Primary Domain
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              text="Refresh"
              variant="secondary"
              loading={isValidating}
              onClick={() => {
                mutate();
              }}
            />
            <Popover
              content={
                <div className="grid w-full gap-px p-2 sm:w-44">
                  <Button
                    text="Edit"
                    variant="outline"
                    onClick={() => {
                      setOpenPopover(false);
                      setShowAddEditDomainModal(true);
                    }}
                    icon={<Edit3 className="h-4 w-4" />}
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
                    className="h-9 justify-start px-2 font-medium"
                  />
                  <Button
                    text="Transfer"
                    variant="outline"
                    onClick={() => {
                      setOpenPopover(false);
                      setShowTransferDomainModal(true);
                    }}
                    icon={<FolderInput className="h-4 w-4" />}
                    className="h-9 justify-start px-2 font-medium"
                    {...(primary &&
                      activeDomainsCount > 1 && {
                        disabledTooltip: (
                          <SimpleTooltipContent
                            title="You cannot transfer your workspace's primary domain. Set another domain as primary to transfer this domain."
                            cta="Learn more."
                            href="https://dub.co/help/article/how-to-set-primary-domain"
                          />
                        ),
                      })}
                  />
                  {!primary && (
                    <Button
                      text="Set as Primary"
                      variant="outline"
                      onClick={() => {
                        setOpenPopover(false);
                        setShowPrimaryDomainModal(true);
                      }}
                      icon={<FileCog className="h-4 w-4" />}
                      className="h-9 justify-start px-2 font-medium"
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
              }
              align="end"
              openPopover={openPopover}
              setOpenPopover={setOpenPopover}
            >
              <Button
                variant="secondary"
                className="px-2"
                icon={<ThreeDots className="h-5 w-5" />}
                onClick={() => {
                  setOpenPopover(!openPopover);
                }}
              />
            </Popover>
          </div>
        </div>
        <div className="flex h-10 flex-col space-y-2 sm:flex-row sm:items-center sm:space-x-5 sm:space-y-0">
          <div className="flex items-center space-x-2">
            {data ? (
              data.status === "Valid Configuration" ? (
                <CheckCircleFill className="h-6 w-6 text-blue-500" />
              ) : data.status === "Pending Verification" ? (
                <AlertCircleFill className="h-6 w-6 text-yellow-500" />
              ) : (
                <XCircleFill className="h-6 w-6 text-red-500" />
              )
            ) : (
              <LoadingCircle className="mr-1 h-5 w-5" />
            )}
            <p className="text-sm text-gray-500">
              {data ? data.status : "Checking Domain Status"}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {target ? (
              <CheckCircleFill className="h-6 w-6 text-blue-500" />
            ) : (
              <XCircleFill className="h-6 w-6 text-gray-400" />
            )}
            <div className="flex space-x-1">
              <p className="text-sm text-gray-500">
                {target ? `${capitalize(type)}s to` : `No ${type} configured`}
              </p>
              {target && (
                <a
                  href={target}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-gray-600 underline-offset-4 hover:underline"
                >
                  {truncate(
                    target.replace(/^(?:https?:\/\/)?(?:www\.)?/i, ""),
                    24,
                  )}
                </a>
              )}
            </div>
          </div>
        </div>
        {data && data.status !== "Valid Configuration" && (
          <DomainConfiguration data={data} />
        )}
      </div>
    </>
  );
}
