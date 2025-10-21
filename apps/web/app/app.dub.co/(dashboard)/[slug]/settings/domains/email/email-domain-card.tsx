import useWorkspace from "@/lib/swr/use-workspace";
import { EmailDomainProps } from "@/lib/types";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Envelope, Plug2, StatusBadge } from "@dub/ui";
import { motion } from "motion/react";
import { useState } from "react";

interface EmailDomainCardProps {
  emailDomain: EmailDomainProps;
}

export function EmailDomainCard({
  emailDomain: { slug: domain, fromAddress, verified },
}: EmailDomainCardProps) {
  const { slug: workspaceSlug } = useWorkspace();
  const [showDetails, setShowDetails] = useState(false);
  const [groupHover, setGroupHover] = useState(false);

  return (
    <div
      className="hover:drop-shadow-card-hover group rounded-xl border border-neutral-200 bg-white transition-[filter]"
      onPointerEnter={() => setGroupHover(true)}
      onPointerLeave={() => setGroupHover(false)}
    >
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
              onClick={() => setShowDetails((s) => !s)}
              className="h-8 rounded-lg"
            >
              {verified ? "Active" : "Pending"}
            </StatusBadge>

            <Button
              variant="secondary"
              className="border-border-subtle h-8 rounded-lg p-2"
              icon={<Plug2 className="size-3.5 shrink-0" />}
              onClick={() => {}}
            />

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
          {showDetails && <></>}
        </motion.div>
      </div>
    </div>
  );
}
