"use client";

import { Button } from "@dub/ui";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FC } from "react";

interface ICancellationFlowSuccessModuleProps {
  pageName: string;
  nextBillingDate: string;
  isCancelled: boolean;
}

export const CancellationFlowSuccessModule: FC<
  Readonly<ICancellationFlowSuccessModuleProps>
> = ({ pageName, nextBillingDate, isCancelled }) => {
  const router = useRouter();

  return (
    <div className="md:py-18 mx-auto mt-4 flex w-full max-w-[470px] flex-col items-center justify-center gap-6 px-4 py-8 md:mt-6">
      <h1 className="text-center text-2xl font-semibold lg:text-2xl">
        Subscription Cancelled
      </h1>
      <p className="text-default-700 text-center text-sm">
        Your subscription has been cancelled. No further charges will occur. You
        can continue using all features until{" "}
        <span className="font-semibold">
          {format(new Date(nextBillingDate), "MMMM d, yyyy")}
        </span>
        . A confirmation email has been sent to your email address. If you need
        further assistance, you can contact support at{" "}
        <Link
          className="font-semibold text-blue-500 underline"
          href="mailto:help@hint.app"
        >
          help@hint.app
        </Link>
        .
      </p>

      <Button
        onClick={() => router.push("/workspace")}
        text="Return to GetQR"
      />
    </div>
  );
};
