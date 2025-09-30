"use client";

import { ReactNode } from "react";
import { CampaignHeader } from "./campaign-header";

export default function NewCampaignLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <CampaignHeader />
      <div className="flex flex-1 justify-center overflow-y-auto">
        <div className="w-full px-4 sm:px-6 md:max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
