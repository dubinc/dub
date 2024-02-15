"use client";

import { LoadingSpinner, Logo } from "@dub/ui";
import { APP_NAME, HOME_DOMAIN } from "@dub/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function UnsubscribeForm() {
  const [unsubscribing, setUnsubscribing] = useState(true);

  useEffect(() => {
    fetch("/api/user/subscribe", {
      method: "DELETE",
    }).then(() => {
      setUnsubscribing(false);
      toast.success(
        `You have been unsubscribed from all ${APP_NAME} marketing emails`,
      );
    });
  }, []);

  return (
    <div className="flex h-screen max-w-xs flex-col items-center justify-center space-y-6 text-center">
      <Link href={HOME_DOMAIN} target="_blank">
        <Logo className="h-12 w-12" />
      </Link>
      <p className="text-lg text-gray-600">
        {unsubscribing
          ? `Unsubscribing you from all ${APP_NAME} marketing emails...`
          : `You have been unsubscribed from all ${APP_NAME} marketing emails`}
      </p>
      {unsubscribing && <LoadingSpinner className="h-7 w-7" />}
    </div>
  );
}
