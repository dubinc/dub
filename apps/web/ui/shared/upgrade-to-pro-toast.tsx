"use client";

import { useRouterStuff } from "@dub/ui";
import { Crown } from "lucide-react";
import Link from "next/link";

export const UpgradeToProToast = ({
  title,
  message,
}: {
  title: string;
  message: string;
}) => {
  const { queryParams } = useRouterStuff();

  return (
    <div className="flex flex-col space-y-3 rounded-lg bg-white p-6 shadow-lg">
      <div className="flex items-center space-x-1.5">
        <Crown className="h-5 w-5 text-black" />{" "}
        <p className="font-semibold">{title}</p>
      </div>
      <p className="text-sm text-gray-600">{message}</p>
      <Link
        href={
          queryParams({
            set: {
              upgrade: "pro",
            },
            getNewPath: true,
          }) as string
        }
        className="w-full rounded-md border border-black bg-black px-3 py-1.5 text-center text-sm text-white transition-all hover:bg-white hover:text-black"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
};
