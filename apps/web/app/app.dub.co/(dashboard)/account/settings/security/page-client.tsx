"use client";

import useUser from "@/lib/swr/use-user";
import { SignInMethods } from "@/ui/account/sign-in-methods";
import { useState } from "react";
import { UpdatePassword } from "./update-password";

export const dynamic = "force-dynamic";

export default function SecurityPageClient() {
  const { user } = useUser();
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <SignInMethods onManagePassword={() => setShowPasswordForm(true)} />
      {user?.hasPassword && showPasswordForm && <UpdatePassword />}
    </div>
  );
}
