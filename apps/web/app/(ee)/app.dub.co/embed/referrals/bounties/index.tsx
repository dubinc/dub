"use client";

import { PartnerBountyProps } from "@/lib/types";
import { AnimatedEmptyState } from "@/ui/shared/animated-empty-state";
import { TAB_ITEM_ANIMATION_SETTINGS } from "@dub/ui";
import { Trophy } from "@dub/ui/icons";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  BountyEndDate,
  PartnerBountyCard,
} from "../../../../partners.dub.co/(dashboard)/programs/[programSlug]/(enrolled)/bounties/bounty-card";
import { useReferralsEmbedData } from "../page-client";
import { EmbedBountyDetail, EmbedBountyView } from "./detail";

export function ReferralsEmbedBounties() {
  const {
    bounties: initialBounties,
    partnerPlatforms,
    programEnrollment,
  } = useReferralsEmbedData();

  const [bounties, setBounties] =
    useState<PartnerBountyProps[]>(initialBounties);
  const [selectedBounty, setSelectedBounty] =
    useState<PartnerBountyProps | null>(null);
  const [view, setView] = useState<EmbedBountyView>({ mode: "detail" });

  const animKey = selectedBounty
    ? view.mode === "detail"
      ? `detail-${selectedBounty.id}`
      : view.mode === "submission-form"
        ? `sf-${selectedBounty.id}-${view.periodNumber}`
        : `sv-${selectedBounty.id}-${view.periodNumber}`
    : bounties.length === 0
      ? "empty"
      : "list";

  const handleSelectBounty = (bounty: PartnerBountyProps) => {
    setView({ mode: "detail" });
    setSelectedBounty(bounty);
  };

  const handleBack = () => {
    setView({ mode: "detail" });
    setSelectedBounty(null);
  };

  const handleBountyUpdate = (updatedBounty: PartnerBountyProps) => {
    setSelectedBounty(updatedBounty);
    setBounties((prev) =>
      prev.map((b) => (b.id === updatedBounty.id ? updatedBounty : b)),
    );
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={animKey} {...TAB_ITEM_ANIMATION_SETTINGS}>
        {selectedBounty ? (
          <EmbedBountyDetail
            bounty={selectedBounty}
            partnerPlatforms={partnerPlatforms}
            programEnrollment={programEnrollment}
            view={view}
            setView={setView}
            onBack={handleBack}
            onBountyUpdate={handleBountyUpdate}
          />
        ) : bounties.length === 0 ? (
          <AnimatedEmptyState
            title="No bounties available"
            description="This program isn't offering any bounties at the moment."
            cardContent={(idx) => {
              const Icon = [Trophy, Trophy][idx % 2];
              return (
                <>
                  <Icon className="text-content-default size-4" />
                  <div className="bg-bg-emphasis h-2.5 w-24 min-w-0 rounded-sm" />
                </>
              );
            }}
          />
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(317px, 1fr))",
            }}
          >
            {bounties.map((bounty) => (
              <PartnerBountyCard
                key={bounty.id}
                bounty={bounty}
                onClick={() => handleSelectBounty(bounty)}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export { BountyEndDate };
