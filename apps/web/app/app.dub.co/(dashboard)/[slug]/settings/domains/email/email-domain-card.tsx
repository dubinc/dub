import useWorkspace from "@/lib/swr/use-workspace";
import { EmailDomainProps } from "@/lib/types";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Envelope, Plug2, Refresh2, StatusBadge, Tooltip } from "@dub/ui";
import { cn, fetcher } from "@dub/utils";
import { motion } from "motion/react";
import { useState } from "react";
import useSWRImmutable from "swr/immutable";
import { EmailDomainDnsRecords } from "./email-domain-dns-records";

interface EmailDomainCardProps {
  emailDomain: EmailDomainProps;
}

export function EmailDomainCard({
  emailDomain: { slug: domain, fromAddress, verified },
}: EmailDomainCardProps) {
  const { id: workspaceId } = useWorkspace();
  const [showDetails, setShowDetails] = useState(false);

  const { isValidating, mutate } = useSWRImmutable(
    workspaceId && `/api/email-domains/${domain}/verify?workspaceId=${workspaceId}`,
    fetcher,
  );

  return (
    <div className="hover:drop-shadow-card-hover group rounded-xl border border-neutral-200 bg-white transition-[filter]">
      <div className="p-4 sm:p-5">
        <div className="flex w-full items-center justify-between gap-2">
          <DomainCardTitleColumn
            domain={domain}
            icon={Envelope}
            url={fromAddress}
          />

          <div className="flex items-center gap-2.5">
            <StatusBadge
              variant={verified ? "success" : "pending"}
              className="h-8 rounded-lg"
            >
              {verified ? "Active" : "Pending"}
            </StatusBadge>

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

            <Button
              variant="outline"
              className="h-8 rounded-lg px-2"
              icon={<ThreeDots className="size-3.5 shrink-0" />}
              onClick={() => {}}
            />
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
  );
}
