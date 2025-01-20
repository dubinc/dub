"use client";
import { useTranslations } from "next-intl";

import useUser from "@/lib/swr/use-user";
import { RequestSetPassword } from "./request-set-password";
import { UpdatePassword } from "./update-password";

export const dynamic = "force-dynamic";

export default function SecurityPageClient() {
  const t = useTranslations("app.dub.co/(dashboard)/account/settings/security");

  const { loading, user } = useUser();

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:p-10">
          <h2 className="text-xl font-medium">{t("password")}</h2>
          <div className="h-3 w-56 rounded-full bg-gray-100"></div>
        </div>
        <div className="p-5 sm:p-10">
          <div className="flex justify-between gap-2">
            <div className="h-3 w-56 rounded-full bg-gray-100"></div>
            <div className="h-3 w-56 rounded-full bg-gray-100"></div>
          </div>
          <div className="mt-5 h-3 rounded-full bg-gray-100"></div>
        </div>
      </div>
    );
  }

  return <>{user?.hasPassword ? <UpdatePassword /> : <RequestSetPassword />}</>;
}
