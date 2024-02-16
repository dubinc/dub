"use client";

import UpdateSubscription from "@/ui/account/update-subscription";
import { Logo } from "@dub/ui";
import { APP_NAME, HOME_DOMAIN } from "@dub/utils";
import Link from "next/link";

export default function UnsubscribeForm() {
  return (
    <div className="flex h-screen flex-col items-center justify-center space-y-6 text-center">
      <Link href={HOME_DOMAIN} target="_blank">
        <Logo className="h-12 w-12" />
      </Link>
      <h1 className="font-display text-4xl font-bold">Email Preferences</h1>
      <p className="text-lg text-gray-600">
        Configure your email preferences for {APP_NAME}.
      </p>
      <div className="rounded-lg border border-gray-200 bg-white px-6 py-3">
        <UpdateSubscription />
      </div>
    </div>
  );
}
