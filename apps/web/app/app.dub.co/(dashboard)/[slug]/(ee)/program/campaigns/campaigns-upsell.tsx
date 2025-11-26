"use client";

import { usePartnersUpgradeModal } from "@/ui/partners/partners-upgrade-modal";
import { CampaignType } from "@dub/prisma/client";
import { Button } from "@dub/ui";
import { nFormatter } from "@dub/utils";
import { CampaignTypeIcon } from "./campaign-type-icon";
import { CampaignsPageContent } from "./campaigns-page-content";

export function CampaignsUpsell() {
  const { partnersUpgradeModal, setShowPartnersUpgradeModal } =
    usePartnersUpgradeModal();

  return (
    <CampaignsPageContent>
      {partnersUpgradeModal}
      <div className="flex min-h-[calc(100vh-200px)] flex-col items-center justify-center gap-6 overflow-hidden px-4 py-10">
        <div
          className="flex w-full max-w-sm flex-col gap-4 overflow-hidden px-4 [mask-image:linear-gradient(transparent,black,transparent)]"
          aria-hidden
        >
          {EXAMPLE_CAMPAIGNS.map((campaign, idx) => (
            <ExampleCampaignCell key={idx} campaign={campaign} />
          ))}
        </div>
        <div className="max-w-sm text-pretty text-center">
          <span className="text-base font-medium text-neutral-900">
            Email campaigns
          </span>
          <p className="text-content-subtle mt-2 text-sm">
            Send{" "}
            <a
              href="https://dub.co/help/article/email-campaigns"
              target="_blank"
              rel="noopener noreferrer"
              className="text-content-default hover:text-content-emphasis cursor-alias underline decoration-dotted underline-offset-2"
            >
              marketing and transactional emails
            </a>{" "}
            to your partners to increase engagement and drive conversions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowPartnersUpgradeModal(true)}
            text="Upgrade to Advanced"
            className="h-8 px-3"
          />
        </div>
      </div>
    </CampaignsPageContent>
  );
}

const EXAMPLE_CAMPAIGNS: {
  type: CampaignType;
  name: string;
  partnersCount: number;
}[] = [
  {
    type: "marketing",
    name: "Introducing our new product",
    partnersCount: 168,
  },
  {
    type: "transactional",
    name: "Congrats on your first sale",
    partnersCount: 124,
  },
  {
    type: "marketing",
    name: "New landing page alert",
    partnersCount: 136,
  },
];

function ExampleCampaignCell({
  campaign,
}: {
  campaign: (typeof EXAMPLE_CAMPAIGNS)[number];
}) {
  return (
    <div className="flex size-full select-none items-center justify-between gap-2 overflow-hidden rounded-2xl border border-neutral-200 bg-transparent bg-white p-4">
      <div className="flex min-w-0 items-center gap-4">
        <CampaignTypeIcon type={campaign.type} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-content-default truncate text-sm font-semibold">
            {campaign.name}
          </span>
        </div>
      </div>

      <span className="text-content-subtle hidden whitespace-nowrap text-xs sm:inline-block">
        {nFormatter(campaign.partnersCount)} partners
      </span>
    </div>
  );
}
