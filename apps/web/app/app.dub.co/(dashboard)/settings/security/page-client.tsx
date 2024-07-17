"use client";

import useUser from "@/lib/swr/use-user";
import { LoadingSpinner } from "@dub/ui";
import { RequestSetPassword } from "./request-set-password";
import { UpdatePassword } from "./update-password";

export const dynamic = "force-dynamic";

export default function SecurityPageClient() {
  const { loading, user } = useUser();

  if (loading) {
    return <LoadingSpinner />;
  }

  return <>{user?.hasPassword ? <UpdatePassword /> : <RequestSetPassword />}</>;
}
