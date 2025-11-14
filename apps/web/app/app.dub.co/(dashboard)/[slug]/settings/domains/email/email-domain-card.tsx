import useWorkspace from "@/lib/swr/use-workspace";
import { EmailDomainProps } from "@/lib/types";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { useAddEditEmailDomainModal } from "@/ui/modals/add-edit-email-domain-modal";
import { useDeleteEmailDomainModal } from "@/ui/modals/delete-email-domain-modal";
import { Delete, ThreeDots } from "@/ui/shared/icons";
import { GetDomainResponseSuccess } from "@dub/email/resend/types";
import {
  Button,
  Envelope,
  PenWriting,
  Plug2,
  Popover,
  Refresh2,
  StatusBadge,
  Tooltip,
  useInViewport,
} from "@dub/ui";
import { capitalize, cn, fetcher, formatDate } from "@dub/utils";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import useSWRImmutable from "swr/immutable";
import { EMAIL_DOMAIN_STATUS_TO_VARIANT } from "./constants";
import { EmailDomainDnsRecords } from "./email-domain-dns-records";

interface EmailDomainCardProps {
  domain: EmailDomainProps;
}

export function EmailDomainCard({ domain }: EmailDomainCardProps) {
  const { id: workspaceId } = useWorkspace();
  const [showDetails, setShowDetails] = useState(false);
  const [openPopover, setOpenPopover] = useState(false);
  const domainRef = useRef<HTMLDivElement>(null);
  const isVisible = useInViewport(domainRef, { defaultValue: true });

  const { isValidating, mutate, data } =
    useSWRImmutable<GetDomainResponseSuccess>(
      workspaceId &&
        isVisible &&
        `/api/email-domains/${domain.slug}/verify?workspaceId=${workspaceId}`,
      fetcher,
    );

  const { addEditEmailDomainModal, setIsOpen: setShowEditModal } =
    useAddEditEmailDomainModal({
      emailDomain: {
        id: domain.id,
        slug: domain.slug,
      },
    });

  const { DeleteEmailDomainModal, setShowDeleteEmailDomainModal } =
    useDeleteEmailDomainModal({
      id: domain.id,
      slug: domain.slug,
    });

  // Automatically open DNS records section if status is not verified
  useEffect(() => {
    if (data?.status && data.status !== "verified") {
      setShowDetails(true);
    }
  }, [data?.status]);

  return (
    <>
      {addEditEmailDomainModal}
      <DeleteEmailDomainModal />
      <div
        ref={domainRef}
        className="hover:drop-shadow-card-hover group rounded-xl border border-neutral-200 bg-white transition-[filter]"
      >
        <div className="p-4 sm:p-5">
          <div className="flex w-full items-center justify-between gap-2">
            <DomainCardTitleColumn
              domain={domain.slug}
              icon={Envelope}
              description={`Added on ${formatDate(domain.createdAt)}`}
            />

            <div className="flex items-center gap-2.5">
              {!isValidating && data?.status ? (
                <StatusBadge
                  variant={EMAIL_DOMAIN_STATUS_TO_VARIANT[data.status]}
                  className="h-8 rounded-lg"
                >
                  {capitalize(data.status.replace(/_/g, " "))}
                </StatusBadge>
              ) : (
                <div className="h-8 min-w-20 animate-pulse rounded-lg bg-neutral-200" />
              )}

              <Button
                variant="secondary"
                className="border-border-subtle h-8 rounded-lg p-2"
                icon={<Plug2 className="size-3.5 shrink-0" />}
                onClick={() => setShowDetails((s) => !s)}
              />

              <Tooltip content="Refresh">
                <Button
                  icon={
                    <Refresh2
                      className={cn(
                        "size-3.5 shrink-0 -scale-100 transition-colors [animation-duration:0.25s]",
                        isValidating && "animate-spin text-neutral-500",
                      )}
                    />
                  }
                  variant="secondary"
                  className="h-8 rounded-lg p-2 text-neutral-600"
                  onClick={() => mutate()}
                />
              </Tooltip>

              <Popover
                content={
                  <div className="w-full sm:w-48">
                    <div className="grid gap-px p-2">
                      <Button
                        text="Edit"
                        variant="outline"
                        onClick={() => {
                          setOpenPopover(false);
                          setShowEditModal(true);
                        }}
                        icon={<PenWriting className="h-4 w-4" />}
                        className="h-9 justify-start px-2 font-medium"
                      />
                      <Button
                        text="Delete"
                        variant="danger-outline"
                        onClick={() => {
                          setOpenPopover(false);
                          setShowDeleteEmailDomainModal(true);
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
                  className="h-8 rounded-lg px-2"
                  icon={<ThreeDots className="size-3.5 shrink-0" />}
                  onClick={() => setOpenPopover(!openPopover)}
                />
              </Popover>
            </div>
          </div>

          <motion.div
            initial={false}
            animate={{ height: showDetails ? "auto" : 0 }}
            className="overflow-hidden"
          >
            {showDetails && <EmailDomainDnsRecords domain={domain} />}
          </motion.div>
        </div>
      </div>
    </>
  );
}
