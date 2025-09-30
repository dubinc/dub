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
      <div className="flex flex-1 items-start justify-center overflow-y-auto">
        <div className="w-full max-w-4xl px-6 py-8">{children}</div>
      </div>
    </div>
  );
}
