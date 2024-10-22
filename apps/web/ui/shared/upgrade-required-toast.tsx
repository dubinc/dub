"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Crown } from "lucide-react";
import Link from "next/link";

export const UpgradeRequiredToast = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => {
  const { slug, nextPlan } = useWorkspace();

  return (
    <div className="flex flex-col space-y-3 rounded-lg bg-white p-6 shadow-lg">
      <div className="flex items-center space-x-1.5">
        <Crown className="h-5 w-5 text-black" />{" "}
        <p className="font-semibold">{title}</p>
      </div>
      <p className="text-sm text-gray-600">{message}</p>
      <Link
        href={slug ? `/${slug}/upgrade?exit=close` : "https://dub.co/pricing"}
        target="_blank"
        className="w-full rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-gray-800 hover:ring-4 hover:ring-gray-200"
      >
        Upgrade to {nextPlan.name}
      </Link>
    </div>
  );
};
