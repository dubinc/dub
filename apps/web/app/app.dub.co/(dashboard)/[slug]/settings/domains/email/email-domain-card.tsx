import useWorkspace from "@/lib/swr/use-workspace";
import { EmailDomainProps } from "@/lib/types";
import { DomainCardTitleColumn } from "@/ui/domains/domain-card-title-column";
import { ThreeDots } from "@/ui/shared/icons";
import { Button, Envelope, StatusBadge } from "@dub/ui";
import { Mail } from "lucide-react";
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

  //grid grid-cols-[1.5fr_1fr] items-center gap-3 sm:grid-cols-[3fr_1fr_1.5fr] sm:gap-4 md:grid-cols-[2fr_1fr_0.5fr_1.5fr]

  return (
    <div
      className="hover:drop-shadow-card-hover group rounded-xl border border-neutral-200 bg-white transition-[filter]"
      onPointerEnter={() => setGroupHover(true)}
      onPointerLeave={() => setGroupHover(false)}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <DomainCardTitleColumn
            domain={domain}
            icon={Envelope}
            url={fromAddress}
          />

          <div className="flex">
            <StatusBadge
              variant={verified ? "success" : "pending"}
              onClick={() => setShowDetails((s) => !s)}
            >
              {verified ? "Active" : "Pending"}
            </StatusBadge>

            <Button
              variant="outline"
              className="h-8 rounded-none border-0 px-2 transition-[border-color] duration-200"
              icon={<Mail className="h-5 w-5 shrink-0" />}
              onClick={() => {}}
            />

            <Button
              variant="outline"
              className="h-8 rounded-none border-0 px-2 transition-[border-color] duration-200"
              icon={<ThreeDots className="h-5 w-5 shrink-0" />}
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
